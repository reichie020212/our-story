import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { error, json, zodError } from "@/lib/api";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { startSession } from "@/lib/session";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 5, "1 m");

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

const INVALID_CREDENTIALS = () =>
  error(401, "invalid_credentials", "Email or password is incorrect.");

export async function POST(req: Request) {
  const blocked = await enforce(limiter(), `ip:${await clientIp()}`);
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return INVALID_CREDENTIALS();
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return INVALID_CREDENTIALS();

  await startSession(user.id);
  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      handle: user.handle,
      initial: user.initial,
    },
  });
}
