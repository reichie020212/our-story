import { z } from "zod";
import { db } from "@/lib/db";
import {
  hashPassword,
  initialFromName,
  uniqueHandle,
} from "@/lib/auth";
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
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(80),
});

// Mobile-only signup. Mirrors the web /auth/signup but issues an
// RS256 access + opaque refresh pair instead of starting a cookie
// session — mobile clients ignore cookies, so the previous "create
// user via /auth/signup then call /auth/mobile/login" dance left
// an orphan Session row per signup.
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
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return error(409, "email_taken", "That email already has an account.");
  }

  const passwordHash = await hashPassword(password);
  const handle = await uniqueHandle(name);
  const user = await db.user.create({
    data: {
      email,
      name,
      handle,
      initial: initialFromName(name),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      handle: true,
      initial: true,
    },
  });

  try {
    const [access, refresh] = await Promise.all([
      signAccessToken(user.id),
      issueRefreshToken(user.id),
    ]);
    return json(
      {
        user,
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        refreshToken: refresh.token,
        refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof MobileAuthNotConfiguredError) {
      return error(503, "mobile_auth_not_configured", err.message);
    }
    throw err;
  }
}
