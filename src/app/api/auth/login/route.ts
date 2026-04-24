import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/appSession";
import { verifyUserPassword } from "@/lib/auth/verifyLogin";

type Body = { user?: string; token?: string; login?: { user?: string; token?: string } };

function parseCredentials(body: Body): { user: string; token: string } | null {
  const u =
    (typeof body.user === "string" && body.user) ||
    (body.login && typeof body.login.user === "string" && body.login.user) ||
    null;
  const t =
    (typeof body.token === "string" && body.token) ||
    (body.login && typeof body.login.token === "string" && body.login.token) ||
    null;
  if (!u || t == null) {
    return null;
  }
  return { user: u, token: t };
}

/**
 * Login using the same credential rules as the other app: shared `document_data` rows
 * (email + password hash) and argon2 verification.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "failed" as const }, { status: 400 });
  }

  const creds = parseCredentials(body);
  if (!creds) {
    return NextResponse.json({ message: "failed" as const }, { status: 400 });
  }

  const result = await verifyUserPassword(creds.user, creds.token);
  if (!result) {
    return NextResponse.json({ message: "failed" as const });
  }

  try {
    const session = await getAppSession();
    session.resourceId = result.resourceId;
    session.securityId = result.securityId;
    session.langId = result.langId;
    await session.save();
  } catch (e) {
    const error =
      e instanceof Error
        ? e.message
        : "Could not create a session. Check server configuration.";
    return NextResponse.json(
      { message: "failed" as const, error, code: "session" as const },
      { status: 503 },
    );
  }

  return NextResponse.json({ message: "success" as const });
}
