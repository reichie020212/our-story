import { NextResponse } from "next/server";
import { error } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import {
  generateState,
  isOAuthProvider,
  makeAuthorizationURL,
  OAuthNotConfiguredError,
  safeNext,
  setOAuthCookies,
} from "@/lib/oauth";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export const runtime = "nodejs";

const limiter = () => getLimiter("auth", 5, "1 m");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const blocked = await enforce(limiter(), `ip:${await clientIp()}`);
    if (blocked) return blocked;

    const { provider } = await params;
    if (!isOAuthProvider(provider)) {
      return error(404, "unknown_provider", "Unknown OAuth provider.");
    }

    const url = new URL(req.url);
    const next = safeNext(url.searchParams.get("next"));

    let authorizeUrl: URL;
    let codeVerifier: string | null;
    const state = generateState();
    try {
      ({ url: authorizeUrl, codeVerifier } = makeAuthorizationURL(
        provider,
        state,
      ));
    } catch (err) {
      if (err instanceof OAuthNotConfiguredError) {
        return error(503, "oauth_not_configured", err.message);
      }
      throw err;
    }

    await setOAuthCookies({ state, codeVerifier, next });
    return NextResponse.redirect(authorizeUrl, 302);
  } catch (err) {
    return handleError(err);
  }
}
