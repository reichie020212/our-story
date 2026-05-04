import { cookies } from "next/headers";
import {
  createSession,
  invalidateSession,
  validateSession,
  type PublicUser,
  type SessionValidation,
} from "./auth";

export const SESSION_COOKIE_NAME = "os-session";

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Read+validate the session cookie. Renews silently when due. */
export async function getCurrentSession(): Promise<SessionValidation> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!id) return { session: null, user: null };
  const result = await validateSession(id);

  // If the session was renewed during validation, push the new expiry
  // down to the cookie too so client and DB stay in sync.
  if (result.session?.fresh) {
    jar.set(SESSION_COOKIE_NAME, id, {
      ...SESSION_COOKIE_OPTIONS,
      expires: result.session.expiresAt,
    });
  }

  // If the session was invalid (deleted or expired), clear the cookie
  // so the next request doesn't re-do the lookup.
  if (!result.session && id) {
    jar.set(SESSION_COOKIE_NAME, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }
  return result;
}

/** Issue a new session and set the cookie. Returns the session record. */
export async function startSession(userId: string) {
  const session = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, session.id, {
    ...SESSION_COOKIE_OPTIONS,
    expires: session.expiresAt,
  });
  return session;
}

/** Clear the active session both server-side and on the client cookie. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE_NAME)?.value;
  if (id) await invalidateSession(id);
  jar.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export type { PublicUser };
