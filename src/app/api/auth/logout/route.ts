import { getAppSession } from "@/lib/auth/appSession";

export async function POST() {
  const session = await getAppSession();
  session.destroy();
  return new Response(null, { status: 204 });
}
