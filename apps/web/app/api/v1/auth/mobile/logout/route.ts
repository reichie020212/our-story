import { z } from "zod";
import { error, json, zodError } from "@/lib/api";
import { revokePresentedRefreshToken } from "@/lib/jwt";

export const runtime = "nodejs";

const Body = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  await revokePresentedRefreshToken(parsed.data.refreshToken);
  return json({ ok: true });
}
