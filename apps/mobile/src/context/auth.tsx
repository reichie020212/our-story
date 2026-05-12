/**
 * Auth state for the mobile client.
 *
 * Boot sequence:
 *   1. Load refresh token from secure storage.
 *   2. If present, exchange it via /auth/mobile/refresh for a new
 *      access + refresh pair, then load /auth/me to get the user.
 *   3. Wire api.ts so every apiFetch call gets the current access
 *      token + a refresh callback for 401-retry.
 *   4. Mark `ready` so the root layout can stop showing the splash.
 *
 * Sign-in / sign-up call /auth/mobile/login or /auth/signup, store
 * the refresh token, and update memory state. Sign-out clears both.
 *
 * Refresh token rotation: every refresh issues a fresh refresh token,
 * which we save back to secure storage so the next launch can use it.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  MobileAuthResponseSchema,
  SignupResponseSchema,
  type MobileAuthResponse,
  type PublicUser,
} from "@our-story/api-types";
import { apiFetchAnonymous, configureApi } from "../lib/api";
import {
  clearRefreshToken,
  loadRefreshToken,
  saveRefreshToken,
} from "../lib/secure-storage";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: PublicUser };

// signUp doesn't sign the user in anymore — the server gates that
// behind a clicked verification link. We surface that to the caller so
// the signup screen can navigate to the "check your email" view.
export type SignUpResult =
  | { kind: "verification_sent"; email: string }
  | { kind: "signed_in"; user: PublicUser };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  // Access token lives in a ref (not state) so api.ts can read the
  // current value synchronously without component re-renders. State
  // changes only fire when the *user* changes, which is what UI cares
  // about.
  const accessTokenRef = useRef<string | null>(null);

  // Persist a stable refresh callback that api.ts can register once.
  // The ref-style closure means it always uses the latest implementation
  // even though configureApi is called during setup.
  const refreshRef = useRef<() => Promise<string | null>>(async () => null);
  const signOutRef = useRef<() => void>(() => {});

  // ---- core helpers ----

  const applyAuth = async (auth: MobileAuthResponse) => {
    accessTokenRef.current = auth.accessToken;
    await saveRefreshToken(auth.refreshToken);
    setState({ status: "signed-in", user: auth.user });
  };

  const clearAuth = async () => {
    accessTokenRef.current = null;
    await clearRefreshToken();
    setState({ status: "signed-out" });
  };

  // ---- token refresh, called by api.ts on 401 ----

  refreshRef.current = async () => {
    const stored = await loadRefreshToken();
    if (!stored) return null;
    try {
      const body = await apiFetchAnonymous<unknown>(
        "/api/v1/auth/mobile/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: stored }),
        },
      );
      const parsed = MobileAuthResponseSchema.parse(body);
      await applyAuth(parsed);
      return parsed.accessToken;
    } catch {
      // refresh itself failed → user must re-authenticate
      await clearAuth();
      return null;
    }
  };

  signOutRef.current = () => {
    void clearAuth();
  };

  // ---- boot ----

  useEffect(() => {
    let cancelled = false;
    configureApi({
      getAccessToken: () => accessTokenRef.current,
      refresh: () => refreshRef.current(),
      onAuthFailure: () => signOutRef.current(),
    });

    (async () => {
      const stored = await loadRefreshToken();
      if (!stored) {
        if (!cancelled) setState({ status: "signed-out" });
        return;
      }
      // refreshRef.current() does the rotation AND calls applyAuth
      // (which sets state to signed-in with the user the server
      // returned). No follow-up /auth/me needed — the refresh
      // response already carries it.
      const newAccess = await refreshRef.current();
      if (!newAccess && !cancelled) {
        // refreshRef already cleared state on failure, but make the
        // signed-out transition explicit in case the boot raced with
        // a render that's expecting `loading`.
        await clearAuth();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- public API ----

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn: async (email, password) => {
        const body = await apiFetchAnonymous<unknown>(
          "/api/v1/auth/mobile/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          },
        );
        const parsed = MobileAuthResponseSchema.parse(body);
        await applyAuth(parsed);
      },
      signUp: async (email, password, name): Promise<SignUpResult> => {
        const body = await apiFetchAnonymous<unknown>(
          "/api/v1/auth/mobile/signup",
          {
            method: "POST",
            body: JSON.stringify({ email, password, name }),
          },
        );
        // New contract: signup returns `verificationRequired`. Keep a
        // soft fallback for the legacy token-pair shape so a stale
        // server during rollout doesn't brick the client.
        const verification = SignupResponseSchema.safeParse(body);
        if (verification.success) {
          return {
            kind: "verification_sent",
            email: verification.data.user.email,
          };
        }
        const tokens = MobileAuthResponseSchema.parse(body);
        await applyAuth(tokens);
        return { kind: "signed_in", user: tokens.user };
      },
      resendVerification: async (email) => {
        await apiFetchAnonymous("/api/v1/auth/resend-verification", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
      },
      signOut: async () => {
        const stored = await loadRefreshToken();
        if (stored) {
          await apiFetchAnonymous("/api/v1/auth/mobile/logout", {
            method: "POST",
            body: JSON.stringify({ refreshToken: stored }),
          }).catch(() => {
            // best-effort: even if the server rejects, we still clear locally
          });
        }
        await clearAuth();
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
