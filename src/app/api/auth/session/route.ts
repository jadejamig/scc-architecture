import { NextResponse } from "next/server";
import { isAppSessionAuthenticated, getAppSession } from "@/lib/auth/appSession";

/**
 * Introspect session, similar to the other app's /api/session (authenticated if resourceId is set).
 */
export async function GET() {
  const session = await getAppSession();
  if (isAppSessionAuthenticated(session)) {
    return NextResponse.json({
      authenticated: true,
      resourceId: session.resourceId,
      securityId: session.securityId,
      langId: session.langId,
    });
  }
  return NextResponse.json({ authenticated: false });
}
