import { NextResponse } from "next/server";
import { getCachedAttributePayload } from "@/lib/attributes/cache";
import { userOr401 } from "@/lib/auth/guardApi";

export async function GET() {
  const denied = await userOr401();
  if (denied) {
    return denied;
  }
  try {
    const payload = await getCachedAttributePayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
