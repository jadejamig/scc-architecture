import { NextResponse } from "next/server";
import { getCachedAttributePayload } from "@/lib/attributes/cache";

export async function GET() {
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
