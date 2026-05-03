import { NextResponse } from "next/server";
import { error } from "./api";
import { getCurrentSession } from "./session";
import type { PublicUser } from "./auth";

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

/** Resolve the current session, or throw UnauthorizedError. */
export async function requireUser(): Promise<PublicUser> {
  const { user } = await getCurrentSession();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Convert an HttpError into a NextResponse; rethrow anything else. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return error(err.status, err.code, err.message);
  }
  throw err;
}
