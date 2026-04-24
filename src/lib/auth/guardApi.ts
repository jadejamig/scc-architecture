import { NextResponse } from "next/server";
import { getAppSession, isAppSessionAuthenticated } from "./appSession";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * If unauthenticated, returns 401. Otherwise `undefined` and the request may proceed.
 * Use when the route is also protected by middleware but you want a defense-in-depth
 * check on the server handler.
 */
export async function userOr401(): Promise<NextResponse | undefined> {
  try {
    const session = await getAppSession();
    if (isAppSessionAuthenticated(session)) {
      return undefined;
    }
    return unauthorized();
  } catch (e) {
    // Unreadable or corrupt cookie, wrong IRON_SESSION_PASSWORD, etc. — treat as signed out
    // so the client can redirect to /login (same as 401 for missing resourceId).
    const detail = e instanceof Error ? e.message : "Session read failed";
    return NextResponse.json(
      { error: "Unauthorized", detail },
      { status: 401 },
    );
  }
}
