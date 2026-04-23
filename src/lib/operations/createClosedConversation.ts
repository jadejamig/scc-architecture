import type { Collection, Document } from "mongodb";
import { ObjectId } from "mongodb";
import {
  getConversationLogCollectionName,
  getDocumentCollectionName,
  getDocumentDataCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";
import { getClosedConversationOperationConfig } from "@/lib/operations/closedConversationConfig";

export type CreateClosedConversationInput = {
  message: string;
  /** If set, this person must already exist (skips email lookup / create). */
  personId?: string;
  /**
   * Client email: required when personId is not set — finds person by email or creates one
   * (same idea as Gmail inbound when the sender is unknown).
   */
  email?: string;
  /** Used only when creating a new person (optional; defaults derived from email local-part). */
  newPersonFirstName?: string;
  newPersonLastName?: string;
  orderNumber?: string;
  subject?: string;
  /**
   * When personId is set: overrides the email stored on the conversation row.
   * When email-only flow: normally same as `email`; set only if you need a different value.
   */
  conversationEmail?: string;
};

export type CreateClosedConversationResult = {
  conversationId: string;
  conversationLogId: string;
  personId: string;
  /** True if a new person document was inserted (email path, no prior match). */
  personCreated: boolean;
};

function filterDataDocs(docs: Record<string, unknown>[]): Record<string, unknown>[] {
  return docs
    .map((doc) =>
      Object.fromEntries(
        Object.entries(doc).filter(
          ([key, value]) =>
            !key.startsWith("dataValue_") ||
            (value !== undefined && value !== null && value !== "")
        )
      )
    )
    .filter((doc) => Object.keys(doc).some((k) => k.startsWith("dataValue_")));
}

function asDocumentId(v: unknown): ObjectId | null {
  if (v instanceof ObjectId) return v;
  if (typeof v === "string" && ObjectId.isValid(v)) return new ObjectId(v);
  return null;
}

async function findPersonIdByEmail(
  dataColl: Collection<Document>,
  emailAttrId: ObjectId,
  email: string
): Promise<ObjectId | null> {
  const row = await dataColl.findOne({
    attributeId: emailAttrId,
    dataValue_text: email.trim(),
  });
  const pid = row?.documentId;
  return asDocumentId(pid);
}

async function createPersonLikeReference(
  docColl: Collection<Document>,
  dataColl: Collection<Document>,
  cfg: ReturnType<typeof getClosedConversationOperationConfig>,
  firstName: string,
  lastName: string,
  email: string
): Promise<ObjectId> {
  const ins = await docColl.insertOne({
    document_type: cfg.personDocumentTypeId,
  });
  const documentId = ins.insertedId as ObjectId;

  const docsRaw: Record<string, unknown>[] = [
    {
      attributeId: cfg.attrParentDocumentType,
      documentId,
      dataValue_object: cfg.personDocumentTypeId,
    },
    {
      attributeId: cfg.personAttrFirstName,
      documentId,
      dataValue_text: firstName,
    },
    {
      attributeId: cfg.personAttrLastName,
      documentId,
      dataValue_text: lastName,
    },
    {
      attributeId: cfg.personEmailAttributeId,
      documentId,
      dataValue_text: email.trim(),
    },
  ];

  await dataColl.insertMany(filterDataDocs(docsRaw));
  return documentId;
}

function defaultNameFromEmail(email: string): { first: string; last: string } {
  const local = email.split("@")[0]?.trim() || "Customer";
  return { first: local, last: "" };
}

async function resolvePersonAndConversationEmail(
  cfg: ReturnType<typeof getClosedConversationOperationConfig>,
  docColl: Collection<Document>,
  dataColl: Collection<Document>,
  input: CreateClosedConversationInput
): Promise<{ personId: ObjectId; conversationEmail: string; personCreated: boolean }> {
  const personIdStr = input.personId?.trim();
  const emailStr = input.email?.trim() ?? "";
  const convEmailOverride = input.conversationEmail?.trim();

  if (personIdStr) {
    if (!ObjectId.isValid(personIdStr)) {
      throw new Error("Invalid personId");
    }
    const personId = new ObjectId(personIdStr);
    const personDoc = await docColl.findOne({ _id: personId });
    if (!personDoc) {
      throw new Error("Person document not found");
    }
    let conversationEmail: string;
    if (convEmailOverride !== undefined && convEmailOverride !== "") {
      conversationEmail = convEmailOverride;
    } else {
      const row = await dataColl.findOne({
        documentId: personId,
        attributeId: cfg.personEmailAttributeId,
      });
      const t = row?.dataValue_text;
      conversationEmail = typeof t === "string" ? t : "";
    }
    return { personId, conversationEmail, personCreated: false };
  }

  if (!emailStr) {
    throw new Error("Provide client email or personId.");
  }

  const existing = await findPersonIdByEmail(
    dataColl,
    cfg.personEmailAttributeId,
    emailStr
  );
  if (existing) {
    return {
      personId: existing,
      conversationEmail: convEmailOverride || emailStr,
      personCreated: false,
    };
  }

  const first =
    input.newPersonFirstName?.trim() ||
    defaultNameFromEmail(emailStr).first;
  const last =
    input.newPersonLastName?.trim() ||
    defaultNameFromEmail(emailStr).last;

  const createdId = await createPersonLikeReference(
    docColl,
    dataColl,
    cfg,
    first,
    last,
    emailStr
  );

  return {
    personId: createdId,
    conversationEmail: convEmailOverride || emailStr,
    personCreated: true,
  };
}

/**
 * Closed conversation, INCOMING direction, first `conversation_log` as **customer** message
 * (`6819ef808196e45dc1be4a2d`, not agent `684483ba08c60c9df11c83c5`).
 * **Email path:** finds person by email or creates one (`create_person` shape).
 * **personId path:** uses an existing person; conversation email from person or override.
 */
export async function createClosedAgentConversation(
  input: CreateClosedConversationInput
): Promise<CreateClosedConversationResult> {
  if (!input.message?.trim()) {
    throw new Error("message is required");
  }

  const cfg = getClosedConversationOperationConfig();
  const client = await getMongoClient();
  const db = client.db(getMongoDbName());
  const docColl = db.collection(getDocumentCollectionName());
  const dataColl = db.collection(getDocumentDataCollectionName());
  const logColl = db.collection(getConversationLogCollectionName());

  const { personId, conversationEmail, personCreated } =
    await resolvePersonAndConversationEmail(cfg, docColl, dataColl, input);

  const timestamp = Date.now();
  const orderPart = input.orderNumber?.trim() ?? "";
  const subject =
    input.subject != null && input.subject.trim() !== ""
      ? input.subject.trim()
      : `Impression Feedback for #${orderPart}`;

  const convInsert = await docColl.insertOne({
    document_type: cfg.conversationDocumentTypeId,
  });
  const conversationId = convInsert.insertedId as ObjectId;

  const docsRaw: Record<string, unknown>[] = [
    {
      attributeId: cfg.attrParentDocumentType,
      documentId: conversationId,
      dataValue_object: cfg.conversationDocumentTypeId,
    },
    {
      attributeId: cfg.attrTimestampA,
      documentId: conversationId,
      dataValue_number: timestamp,
    },
    {
      attributeId: cfg.attrLastActivity,
      documentId: conversationId,
      dataValue_number: timestamp,
    },
    {
      attributeId: cfg.attrConversationKind,
      documentId: conversationId,
      dataValue_object: cfg.conversationKindValue,
    },
    {
      attributeId: cfg.attrDirection,
      documentId: conversationId,
      dataValue_object: cfg.directionIncoming,
    },
    {
      attributeId: cfg.attrStatus,
      documentId: conversationId,
      dataValue_object: cfg.statusClosed,
    },
    {
      attributeId: cfg.attrPlatform,
      documentId: conversationId,
      dataValue_object: cfg.platformId,
    },
    {
      attributeId: cfg.attrPersonOnConversation,
      documentId: conversationId,
      dataValue_object: personId,
    },
    {
      attributeId: cfg.attrConversationEmail,
      documentId: conversationId,
      dataValue_text: conversationEmail,
    },
    {
      attributeId: cfg.attrSubject,
      documentId: conversationId,
      dataValue_text: subject,
    },
  ];

  await dataColl.insertMany(filterDataDocs(docsRaw));

  const logInsert = await logColl.insertOne({
    conversation_id: conversationId,
    conversation_log_type_id: cfg.logTypeCustomerMessage,
    resource_id: personId,
    msg: input.message,
    log_date: timestamp,
  });

  // Same as `conversation_add_message` for INCOMING in app_gmail.js
  await dataColl.updateOne(
    { documentId: conversationId, attributeId: cfg.attrLastActivity },
    { $set: { dataValue_number: Date.now() } },
    { upsert: true }
  );

  return {
    conversationId: conversationId.toHexString(),
    conversationLogId: logInsert.insertedId.toHexString(),
    personId: personId.toHexString(),
    personCreated,
  };
}
