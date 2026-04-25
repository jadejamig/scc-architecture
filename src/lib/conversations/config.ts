import { ObjectId } from "mongodb";
import { getClosedConversationOperationConfig } from "@/lib/operations/closedConversationConfig";

function oidFromEnvOr(key: string, fallback: string): ObjectId {
  const v = (process.env[key]?.trim() || fallback).toLowerCase();
  if (!ObjectId.isValid(v)) {
    throw new Error(`Invalid ObjectId for ${key}: ${v}`);
  }
  return new ObjectId(v);
}

/**
 * Explorer UI + messages — reuses operation config where IDs match; adds agent log type.
 */
export function getConversationsExplorerConfig() {
  const op = getClosedConversationOperationConfig();
  const logTypeAgent = oidFromEnvOr(
    "CONV_LOG_TYPE_AGENT",
    "684483ba08c60c9df11c83c5",
  );
  return {
    conversationDocumentTypeId: op.conversationDocumentTypeId,
    attrStatus: op.attrStatus,
    attrPersonRef: op.attrPersonOnConversation,
    logTypeCustomer: op.logTypeCustomerMessage,
    logTypeAgent,
  };
}
