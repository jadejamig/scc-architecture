import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * POST { "secret": "<REVALIDATE_SECRET>" } to bust the attribute tree cache.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 501 }
    );
  }

  let body: { secret?: string };
  try {
    body = (await request.json()) as { secret?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  revalidateTag("attributes-tree", "default");
  return NextResponse.json({ ok: true });
}
