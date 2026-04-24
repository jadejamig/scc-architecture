import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { getIronSessionOptions } from "./ironOptions";
import type { AppSession } from "./types";

export async function getAppSession(): Promise<IronSession<AppSession>> {
  return getIronSession<AppSession>(await cookies(), getIronSessionOptions());
}

export function isAppSessionAuthenticated(
  s: AppSession,
): s is AppSession & { resourceId: string } {
  return typeof s.resourceId === "string" && s.resourceId.length > 0;
}
