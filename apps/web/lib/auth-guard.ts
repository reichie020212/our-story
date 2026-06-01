import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { error } from "./api";
import { findPublicUser, type PublicUser } from "./auth";
import { verifyAccessToken } from "./jwt";
import { getCurrentSession } from "./session";

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "You must be signed in to do that.") {
    super(401, "unauthenticated", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You don't have permission to do that.") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found.") {
    super(404, "not_found", message);
  }
}

/** Resolve the caller from either the web cookie session or a mobile
 *  RS256 access token. Returns null if neither is present or valid. */
export async function getAuthenticatedUser(): Promise<PublicUser | null> {
  const { user } = await getCurrentSession();
  if (user) return user;

  const authz = (await headers()).get("authorization");
  const match = authz?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  try {
    const { userId } = await verifyAccessToken(match[1]);
    return await findPublicUser(userId);
  } catch {
    return null;
  }
}

/** Resolve the current user, or throw UnauthorizedError. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getAuthenticatedUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Resolve the current user and require the `admin` role. Throws
 *  UnauthorizedError when signed out, ForbiddenError when not an admin. */
export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

/** Convert an HttpError into a NextResponse; rethrow anything else. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return error(err.status, err.code, err.message);
  }
  throw err;
}
