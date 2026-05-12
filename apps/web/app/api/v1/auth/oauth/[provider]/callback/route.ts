import { NextResponse } from "next/server";
import { OAuth2RequestError } from "arctic";
import { db } from "@/lib/db";
import { error } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import { initialFromName, uniqueHandle } from "@/lib/auth";
import {
  consumeOAuthCookies,
  fetchProfile,
  getProviderClient,
  isOAuthProvider,
  OAuthNotConfiguredError,
  safeNext,
  type OAuthProviderName,
} from "@/lib/oauth";
import { startSession } from "@/lib/session";

export const runtime = "nodejs";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

async function exchangeCode(
  provider: OAuthProviderName,
  code: string,
  codeVerifier: string | null,
) {
  const client = getProviderClient(provider);
  if (provider === "google") {
    if (!codeVerifier) throw new Error("Missing PKCE verifier.");
    return await (
      client as ReturnType<typeof getProviderClient>
    ).validateAuthorizationCode(code, codeVerifier);
  }
  // arctic's GitHub.validateAuthorizationCode takes only `code`. The
  // overload picker in TS gets confused across the two providers, so
  // we call through `any` after the runtime check above.
  return await (
    client as unknown as {
      validateAuthorizationCode(c: string): Promise<{ accessToken(): string }>;
    }
  ).validateAuthorizationCode(code);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    if (!isOAuthProvider(provider)) {
      return error(404, "unknown_provider", "Unknown OAuth provider.");
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateFromQuery = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");

    const { state, codeVerifier, next } = await consumeOAuthCookies();

    if (oauthError) {
      return error(
        400,
        "oauth_provider_error",
        `Sign-in cancelled or rejected by ${provider}.`,
      );
    }
    if (!code || !stateFromQuery || !state || stateFromQuery !== state) {
      return error(
        400,
        "invalid_oauth_state",
        "Sign-in handshake failed — please try again.",
      );
    }

    let tokens: { accessToken(): string };
    try {
      tokens = await exchangeCode(provider, code, codeVerifier);
    } catch (err) {
      if (err instanceof OAuthNotConfiguredError) {
        return error(503, "oauth_not_configured", err.message);
      }
      if (err instanceof OAuth2RequestError) {
        return error(
          400,
          "invalid_oauth_code",
          "The sign-in code was rejected by the provider.",
        );
      }
      throw err;
    }

    const profile = await fetchProfile(provider, tokens.accessToken());

    // Three-way resolution:
    //  1. Same (provider, providerId) already linked → existing user.
    //  2. No linked user but the email is in use → link OAuth onto that
    //     user (both providers verify email, so this isn't a takeover
    //     vector).
    //  3. Otherwise create a new user.
    let user = await db.user.findUnique({
      where: {
        oauthProvider_oauthId: {
          oauthProvider: provider,
          oauthId: profile.id,
        },
      },
    });
    if (!user) {
      const byEmail = await db.user.findUnique({
        where: { email: profile.email },
      });
      if (byEmail) {
        user = await db.user.update({
          where: { id: byEmail.id },
          data: {
            oauthProvider: provider,
            oauthId: profile.id,
            // Linking via a provider that confirmed the address proves
            // email ownership — promote unverified accounts so the
            // verification gate doesn't strand them.
            ...(byEmail.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
          },
        });
      } else {
        const handle = await uniqueHandle(profile.name);
        user = await db.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            handle,
            initial: initialFromName(profile.name),
            oauthProvider: provider,
            oauthId: profile.id,
            // OAuth sign-up is pre-verified: the provider already
            // proved control of the email, so no link required.
            emailVerifiedAt: new Date(),
          },
        });
      }
    }

    await startSession(user.id);
    return NextResponse.redirect(`${siteUrl()}${safeNext(next)}`, 302);
  } catch (err) {
    return handleError(err);
  }
}
