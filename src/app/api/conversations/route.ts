import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/conversations/fetch";
import { userOr401 } from "@/lib/auth/guardApi";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const denied = await userOr401();
  if (denied) {
    return denied;
  }
  const sp = request.nextUrl.searchParams;
  const limitRaw = Number(sp.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, limitRaw), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const after = sp.get("after") ?? undefined;
  const q = sp.get("q") ?? undefined;
  try {
    const { items, hasMore, nextCursor } = await listConversations({
      limit,
      after: after ?? undefined,
      q: q ?? undefined,
    });
    return NextResponse.json({ conversations: items, hasMore, nextCursor });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
