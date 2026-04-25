import type { Collection, Document } from "mongodb";
import { ObjectId } from "mongodb";
import {
  getAttributeCollectionName,
  getConversationLogCollectionName,
  getDocumentCollectionName,
  getDocumentDataCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";
import { getPersonDetail } from "@/lib/people/fetch";
import { searchPeople } from "@/lib/people/fetch";
import { getConversationsExplorerConfig } from "./config";

const PAGE_CAP = 50;
const MAX_FILTER_CONVERSATIONS = 2000;

function pickDataValue(d: Document): unknown {
  return d.dataValue_object ?? d.dataValue_text ?? d.dataValue_number;
}

function isHexObjectId24(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (v instanceof ObjectId) return v.toHexString();
  if (typeof v === "object" && v !== null && "$oid" in (v as object)) {
    return String((v as { $oid: string }).$oid);
  }
  return String(v);
}

export type ConversationListItem = {
  id: string;
  statusLabel: string;
  firstName: string;
  lastName: string;
  email: string;
  personId: string | null;
};

export type ConversationMessage = {
  id: string;
  body: string;
  logDate: number;
  messageId: string | null;
  role: "customer" | "agent" | "other";
  rawTypeId: string;
};

function formatStatusValue(v: unknown): string {
  if (v == null) return "—";
  if (v instanceof ObjectId) return v.toHexString();
  if (typeof v === "object" && v !== null && "$oid" in (v as object)) {
    return String((v as { $oid: string }).$oid);
  }
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "—";
}

/** Status values are often an ObjectId referencing a row in the `attribute` collection. */
function toObjectIdIf(v: unknown): ObjectId | null {
  if (v instanceof ObjectId) {
    return v;
  }
  if (typeof v === "string" && isHexObjectId24(v)) {
    return new ObjectId(v.trim());
  }
  if (typeof v === "object" && v !== null && "$oid" in (v as object)) {
    const s = String((v as { $oid: string }).$oid);
    if (isHexObjectId24(s)) {
      return new ObjectId(s);
    }
  }
  return null;
}

async function loadAttributeNameById(
  ids: ObjectId[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((o) => o.toHexString()))].map(
    (h) => new ObjectId(h),
  );
  if (unique.length === 0) {
    return new Map();
  }
  const client = await getMongoClient();
  const coll = client.db(getMongoDbName()).collection(getAttributeCollectionName());
  const rows = await coll
    .find({ _id: { $in: unique } })
    .project({ attribute: 1 })
    .toArray();
  const m = new Map<string, string>();
  for (const r of rows) {
    const id = r._id as ObjectId;
    m.set(
      id.toHexString(),
      String(r.attribute ?? id.toHexString()),
    );
  }
  return m;
}

type ListResult = {
  items: ConversationListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

/**
 * List conversation documents, optional text / id filter, keyset pagination on `_id` desc.
 */
export async function listConversations(options: {
  limit: number;
  after?: string;
  q?: string;
}): Promise<ListResult> {
  const cfg = getConversationsExplorerConfig();
  const limit = Math.min(Math.max(options.limit, 1), PAGE_CAP);
  const after = options.after?.trim();
  const rawQ = options.q?.trim() ?? "";
  const client = await getMongoClient();
  const db = client.db(getMongoDbName());
  const docColl = db.collection(getDocumentCollectionName());
  const dataColl = db.collection(getDocumentDataCollectionName());
  const convType = cfg.conversationDocumentTypeId;
  const { attrStatus, attrPersonRef } = cfg;

  let filterIds: ObjectId[] | null = null;

  if (rawQ) {
    if (isHexObjectId24(rawQ)) {
      const oid = new ObjectId(rawQ);
      const asConv = await docColl.findOne({
        _id: oid,
        document_type: convType,
      });
      if (asConv) {
        filterIds = [oid];
      } else {
        const byRef = await dataColl
          .find({
            attributeId: attrPersonRef,
            dataValue_object: oid,
          })
          .project({ documentId: 1 })
          .toArray();
        const convIds = [
          ...new Set(
            byRef
              .map((r) => r.documentId)
              .filter(Boolean)
              .map((id) => (id instanceof ObjectId ? id : new ObjectId(String(id)))),
          ),
        ];
        filterIds = convIds.length > 0 ? convIds : [];
      }
    } else {
      const people = await searchPeople(rawQ);
      if (people.length === 0) {
        return { items: [], hasMore: false, nextCursor: null };
      }
      const pids = people
        .map((p) => p.personId)
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      if (pids.length === 0) {
        return { items: [], hasMore: false, nextCursor: null };
      }
      const byPerson = await dataColl
        .find({
          attributeId: attrPersonRef,
          dataValue_object: { $in: pids },
        })
        .project({ documentId: 1 })
        .limit(MAX_FILTER_CONVERSATIONS)
        .toArray();
      const convIds = [
        ...new Set(
          byPerson
            .map((r) => r.documentId)
            .filter(Boolean)
            .map((id) => (id instanceof ObjectId ? id : new ObjectId(String(id)))),
        ),
      ];
      filterIds = convIds;
    }
  }

  if (filterIds && filterIds.length === 0) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const ands: Document[] = [{ document_type: convType }];
  if (filterIds) {
    ands.push({ _id: { $in: filterIds } });
  }
  if (after && ObjectId.isValid(after)) {
    ands.push({ _id: { $lt: new ObjectId(after) } });
  }
  const qfilter = ands.length > 1 ? { $and: ands } : ands[0]!;

  const cursor = docColl
    .find(qfilter)
    .sort({ _id: -1 })
    .limit(limit + 1);

  const rawDocs = await cursor.toArray();
  const hasMore = rawDocs.length > limit;
  const pageDocs = (hasMore ? rawDocs.slice(0, limit) : rawDocs) as Document[];

  const items = await enrichConversations(pageDocs, dataColl, attrStatus, attrPersonRef);

  const nextId = hasMore && pageDocs.length > 0 ? asString(pageDocs[pageDocs.length - 1]!._id) : null;

  return { items, hasMore, nextCursor: nextId };
}

async function enrichConversations(
  convDocs: Document[],
  dataColl: Collection<Document>,
  attrStatus: ObjectId,
  attrPersonRef: ObjectId,
): Promise<ConversationListItem[]> {
  if (convDocs.length === 0) return [];

  const convOids = convDocs
    .map((d) => d._id)
    .map((id) => (id instanceof ObjectId ? id : new ObjectId(String(id))));

  const dataRows = await dataColl
    .find({
      documentId: { $in: convOids },
      attributeId: { $in: [attrStatus, attrPersonRef] },
    })
    .toArray();

  const byConv = new Map<string, { status?: unknown; personId?: ObjectId }>();
  for (const r of dataRows) {
    const did = r.documentId;
    const cid = did instanceof ObjectId ? did.toHexString() : String(did);
    if (!byConv.has(cid)) byConv.set(cid, {});
    const g = byConv.get(cid)!;
    const attrRaw = r.attributeId;
    const attr =
      attrRaw instanceof ObjectId
        ? attrRaw
        : ObjectId.isValid(String(attrRaw))
          ? new ObjectId(String(attrRaw))
          : null;
    if (!attr) {
      continue;
    }
    if (attr.equals(attrStatus)) g.status = pickDataValue(r);
    if (attr.equals(attrPersonRef)) {
      const ov = r.dataValue_object ?? r.dataValue_text;
      if (ov instanceof ObjectId) g.personId = ov;
      else if (ObjectId.isValid(String(ov))) g.personId = new ObjectId(String(ov));
    }
  }

  const personIds = [
    ...new Set(
      convOids
        .map((id) => byConv.get(id.toHexString())?.personId)
        .filter((x): x is ObjectId => x != null),
    ),
  ];
  const personInfo = new Map<string, { first: string; last: string; email: string }>();
  await Promise.all(
    personIds.map(async (pid) => {
      const d = await getPersonDetail(pid.toHexString());
      const h = pid.toHexString();
      if (!d) {
        personInfo.set(h, { first: "", last: "", email: "" });
        return;
      }
      const r = d as Record<string, unknown>;
      personInfo.set(h, {
        first: asString(r.first_name),
        last: asString(r.last_name),
        email: asString(r.email),
      });
    }),
  );

  const statusOids: ObjectId[] = [];
  for (const g of byConv.values()) {
    const oid = toObjectIdIf(g.status);
    if (oid) {
      statusOids.push(oid);
    }
  }
  const attrNameById = await loadAttributeNameById(statusOids);

  return convDocs.map((doc) => {
    const id = (doc._id as ObjectId).toHexString();
    const g = byConv.get(id) ?? {};
    const phex = g.personId?.toHexString();
    const pi = phex ? personInfo.get(phex) : undefined;
    const statusOid = toObjectIdIf(g.status);
    let statusLabel: string;
    if (statusOid) {
      const fromAttr = attrNameById.get(statusOid.toHexString());
      statusLabel = fromAttr ?? formatStatusValue(g.status);
    } else {
      statusLabel = formatStatusValue(g.status);
    }
    return {
      id,
      statusLabel,
      firstName: pi?.first ?? "",
      lastName: pi?.last ?? "",
      email: pi?.email ?? "",
      personId: phex ?? null,
    } satisfies ConversationListItem;
  });
}

export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  if (!ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversationId");
  }
  const cfg = getConversationsExplorerConfig();
  const client = await getMongoClient();
  const logColl = client.db(getMongoDbName()).collection(getConversationLogCollectionName());
  const tCustomer = cfg.logTypeCustomer;
  const tAgent = cfg.logTypeAgent;

  const convOid = new ObjectId(conversationId);
  const rows = await logColl
    .find({ conversation_id: convOid })
    .sort({ log_date: 1, _id: 1 })
    .toArray();

  return rows.map((doc) => {
    const t = doc.conversation_log_type_id;
    const tid = t instanceof ObjectId ? t : new ObjectId(String(t));
    let role: ConversationMessage["role"] = "other";
    if (tid.equals(tCustomer)) role = "customer";
    else if (tid.equals(tAgent)) role = "agent";
    const _id = doc._id as ObjectId;
    return {
      id: _id.toHexString(),
      body: typeof doc.msg === "string" ? doc.msg : "",
      logDate: typeof doc.log_date === "number" ? doc.log_date : 0,
      messageId: doc.messageId != null ? String(doc.messageId) : null,
      role,
      rawTypeId: tid.toHexString(),
    };
  });
}
