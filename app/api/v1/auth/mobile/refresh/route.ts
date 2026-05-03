import { z } from "zod";
import { error, json, zodError } from "@/lib/api";
import {
  InvalidRefreshTokenError,
  MobileAuthNotConfiguredError,
  rotateRefreshToken,
  signAccessToken,
} from "@/lib/jwt";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 30, "1 m");

const Body = z.object({
  refreshToken: z.string().min(1),
});

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

  try {
    const { userId, refresh } = await rotateRefreshToken(parsed.data.refreshToken);
    const access = await signAccessToken(userId);
    return json({
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof InvalidRefreshTokenError) {
      return error(401, "invalid_refresh_token", err.message);
    }
    if (err instanceof MobileAuthNotConfiguredError) {
      return error(503, "mobile_auth_not_configured", err.message);
    }
    throw err;
  }
}
