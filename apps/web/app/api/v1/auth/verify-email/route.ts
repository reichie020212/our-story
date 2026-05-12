import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { startSession } from "@/lib/session";
import { consumeVerificationToken } from "@/lib/verification";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 10, "1 m");

const Body = z.object({
  token: z.string().trim().min(20).max(200),
});

// Single-use: consume the token, set emailVerifiedAt, drop a session
// cookie. The token comes from the link in the verification email.
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

  const result = await consumeVerificationToken(parsed.data.token);
  if (!result.ok) {
    const codes = {
      invalid: "verification_invalid",
      expired: "verification_expired",
      consumed: "verification_used",
    } as const;
    const messages = {
      invalid: "This verification link is not valid.",
      expired: "This verification link has expired. Request a new one.",
      consumed: "This verification link has already been used.",
    } as const;
    return error(400, codes[result.reason], messages[result.reason]);
  }

  const user = await db.user.findUnique({
    where: { id: result.userId },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      initial: true,
    },
  });
  if (!user) return error(404, "user_missing", "User account was not found.");

  // Web flow: start a cookie session so the user lands signed-in.
  // Mobile clients ignore the cookie and hit /auth/mobile/login next.
  await startSession(user.id);
  return json({ user });
}
