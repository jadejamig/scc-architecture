import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getPersonDetail } from "@/lib/people/fetch";

type Ctx = { params: Promise<{ personId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { personId } = await context.params;
  if (!ObjectId.isValid(personId)) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }
  try {
    const person = await getPersonDetail(personId);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
