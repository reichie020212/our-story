import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { error, json, zodError } from "@/lib/api";
import {
  issueRefreshToken,
  signAccessToken,
  MobileAuthNotConfiguredError,
} from "@/lib/jwt";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 5, "1 m");

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

const INVALID = () =>
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
  if (!user || !user.passwordHash) return INVALID();
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return INVALID();

  if (!user.emailVerifiedAt) {
    return error(
      403,
      "email_not_verified",
      "Please verify your email before signing in. Check your inbox for the link, or request a new one.",
      { email: user.email },
    );
  }

  try {
    const [access, refresh] = await Promise.all([
      signAccessToken(user.id),
      issueRefreshToken(user.id),
    ]);
    return json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        handle: user.handle,
        initial: user.initial,
        role: user.role,
      },
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof MobileAuthNotConfiguredError) {
      return error(503, "mobile_auth_not_configured", err.message);
    }
    throw err;
  }
}
