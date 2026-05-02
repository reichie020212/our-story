import { error, json } from "@/lib/api";
import { getCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) return error(401, "unauthenticated", "Not signed in.");
  return json({ user });
}
