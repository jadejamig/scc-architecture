import { getIronSession, type IronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import { getIronSessionOptions } from "@/lib/auth/ironOptions";
import type { AppSession } from "@/lib/auth/types";

const PUBLIC_NO_SESSION_API = new Set([
  "/api/auth/login",
  "/api/auth/session",
  "/api/attributes/revalidate",
]);

async function readSession(
  request: NextRequest,
  response: NextResponse,
): Promise<IronSession<AppSession> | "invalid"> {
  try {
    return await getIronSession<AppSession>(
      request,
      response,
      getIronSessionOptions(),
    );
  } catch {
    // Bad seal, password rotation, or corrupt cookie — treat as signed out
    return "invalid";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_NO_SESSION_API.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const res = NextResponse.next();
    const session = await readSession(request, res);
    if (session !== "invalid" && session.resourceId) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return res;
  }

  const res = NextResponse.next();
  const session = await readSession(request, res);
  const unauthenticated = session === "invalid" || !session.resourceId;
  if (unauthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
