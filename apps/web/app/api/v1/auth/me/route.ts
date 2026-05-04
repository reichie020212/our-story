import { error, json } from "@/lib/api";
import { getAuthenticatedUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return error(401, "unauthenticated", "Not signed in.");
  return json({ user });
}
