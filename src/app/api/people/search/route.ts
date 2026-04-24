import { NextRequest, NextResponse } from "next/server";
import { userOr401 } from "@/lib/auth/guardApi";
import { searchPeople } from "@/lib/people/fetch";

export async function GET(request: NextRequest) {
  const denied = await userOr401();
  if (denied) {
    return denied;
  }
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const people = await searchPeople(q);
    return NextResponse.json({ people, query: q });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
