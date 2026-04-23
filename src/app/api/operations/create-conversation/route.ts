import { NextResponse } from "next/server";
import { createClosedAgentConversation } from "@/lib/operations/createClosedConversation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message : "";
  const personId = typeof b.personId === "string" ? b.personId : undefined;
  const email = typeof b.email === "string" ? b.email : undefined;

  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const hasPerson = personId?.trim();
  const hasEmail = email?.trim();
  if (!hasPerson && !hasEmail) {
    return NextResponse.json(
      { error: "Provide client email and/or personId" },
      { status: 400 }
    );
  }

  try {
    const result = await createClosedAgentConversation({
      message,
      personId: hasPerson ? personId!.trim() : undefined,
      email: hasEmail ? email!.trim() : undefined,
      newPersonFirstName:
        typeof b.newPersonFirstName === "string" ? b.newPersonFirstName : undefined,
      newPersonLastName:
        typeof b.newPersonLastName === "string" ? b.newPersonLastName : undefined,
      orderNumber: typeof b.orderNumber === "string" ? b.orderNumber : undefined,
      subject: typeof b.subject === "string" ? b.subject : undefined,
      conversationEmail:
        typeof b.conversationEmail === "string" ? b.conversationEmail : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Unknown error";
    const status =
      messageText === "Person document not found"
        ? 404
        : messageText === "Invalid personId" ||
            messageText === "Provide client email or personId" ||
            messageText === "message is required" ||
            messageText === "Provide client email and/or personId"
          ? 400
          : 500;
    return NextResponse.json({ error: messageText }, { status });
  }
}
