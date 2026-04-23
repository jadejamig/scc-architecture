import { ObjectId } from "mongodb";

function oid(key: string, fallback: string): ObjectId {
  const v = (process.env[key]?.trim() || fallback).toLowerCase();
  if (!ObjectId.isValid(v)) {
    throw new Error(`Invalid ObjectId for ${key}`);
  }
  return new ObjectId(v);
}

/**
 * Closed conversation + first log as **customer** (INCOMING) message — same log type as
 * Gmail inbound (`6819ef808196e45dc1be4a2d`), not agent (`684483ba08c60c9df11c83c5`).
 */
export function getClosedConversationOperationConfig() {
  return {
    conversationDocumentTypeId: oid(
      "OP_CONV_DOCUMENT_TYPE_ID",
      "69078bb8225c75a8aa4a1809"
    ),
    attrParentDocumentType: oid(
      "OP_ATTR_PARENT_DOCUMENT_TYPE",
      "69078901225c75a8aa4a1807"
    ),
    attrTimestampA: oid("OP_ATTR_TIMESTAMP_A", "690ca245470a849591056b95"),
    attrLastActivity: oid("OP_ATTR_LAST_ACTIVITY", "69d9946c8be73bb8ae465c64"),
    attrConversationKind: oid("OP_ATTR_CONVERSATION_KIND", "690ca252470a849591056b99"),
    conversationKindValue: oid(
      "OP_CONVERSATION_KIND_VALUE",
      "67e3f465dceae1e360605fd4"
    ),
    attrDirection: oid("OP_ATTR_DIRECTION", "690ca277470a849591056b9d"),
    /** INCOMING — message is from the customer (matches Gmail `conversation_direction` inbound). */
    directionIncoming: oid("OP_DIRECTION_INCOMING", "67d2d1d609fe2255c954bbd8"),
    attrStatus: oid("OP_ATTR_STATUS", "690ca28c470a849591056ba1"),
    statusClosed: oid("OP_STATUS_CLOSED", "67254ce210f4dff8d838d635"),
    attrPlatform: oid("OP_ATTR_PLATFORM", "69592db10454b5390197f5f6"),
    platformId: oid("OP_PLATFORM_ID", "6997905ffea7aca1859c1b99"),
    attrPersonOnConversation: oid(
      "OP_ATTR_PERSON_ON_CONV",
      "690ca2b0470a849591056ba9"
    ),
    attrConversationEmail: oid("OP_ATTR_CONV_EMAIL", "69d7acbb8be73bb8ae465c4e"),
    attrSubject: oid("OP_ATTR_SUBJECT", "69db944c8be73bb8ae465c7a"),
    /** Customer / inbound message (see `get_conversation_log_type_id` INCOMING in app_gmail.js). */
    logTypeCustomerMessage: oid(
      "OP_LOG_TYPE_CUSTOMER",
      "6819ef808196e45dc1be4a2d"
    ),
    personEmailAttributeId: oid(
      "PERSON_ATTR_EMAIL",
      "6909d95ec816ac1c36e43a9f"
    ),
    /** `create_person` in reference/app_gmail.js */
    personDocumentTypeId: oid(
      "PERSON_DOCUMENT_TYPE_ID",
      "690769fc225c75a8aa4a17ed"
    ),
    personAttrFirstName: oid(
      "PERSON_ATTR_FIRST_NAME",
      "6909d92ac816ac1c36e43a99"
    ),
    personAttrLastName: oid(
      "PERSON_ATTR_LAST_NAME",
      "6909d93ec816ac1c36e43a9c"
    ),
  };
}
