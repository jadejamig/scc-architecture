import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { userOr401 } from "@/lib/auth/guardApi";
import { getConversationMessages } from "@/lib/conversations/fetch";
import { getConversationsExplorerConfig } from "@/lib/conversations/config";
import {
  getDocumentCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";

type Ctx = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const denied = await userOr401();
  if (denied) {
    return denied;
  }
  const { conversationId } = await context.params;
  if (!ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }
  const cfg = getConversationsExplorerConfig();
  const client = await getMongoClient();
  const doc = await client
    .db(getMongoDbName())
    .collection(getDocumentCollectionName())
    .findOne({
      _id: new ObjectId(conversationId),
      document_type: cfg.conversationDocumentTypeId,
    });
  if (!doc) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  try {
    const messages = await getConversationMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
