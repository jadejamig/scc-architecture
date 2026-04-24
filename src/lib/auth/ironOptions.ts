import type { SessionOptions } from "iron-session";

let cached: SessionOptions | undefined;

function sessionPassword(): string {
  const p = process.env.IRON_SESSION_PASSWORD;
  if (!p || p.length < 32) {
    throw new Error(
      [
        "Server configuration: in your project .env (or .env.local), set IRON_SESSION_PASSWORD=",
        "a long random secret (at least 32 characters) to encrypt session cookies. ",
        "This is for developers only — it is not your app login password, which can be any length. ",
        "Example: run `openssl rand -base64 32` and paste the value, then restart the dev server.",
      ].join(""),
    );
  }
  return p;
}

/**
 * iron-session config for this app. Shared by middleware, route handlers, and server code.
 */
export function getIronSessionOptions(): SessionOptions {
  if (!cached) {
    const secure =
      process.env.IRON_SESSION_COOKIE_SECURE === "true" ||
      (process.env.IRON_SESSION_COOKIE_SECURE !== "false" &&
        process.env.NODE_ENV === "production");
    cached = {
      password: sessionPassword(),
      cookieName: process.env.IRON_SESSION_COOKIE_NAME ?? "eav_scc_session",
      cookieOptions: {
        httpOnly: true,
        secure,
        sameSite: "lax" as const,
        path: "/",
      },
    };
  }
  return cached;
}
