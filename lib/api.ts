import { NextResponse } from "next/server";
import type { PublicUser } from "./auth";
import type { ZodError } from "zod";

/** Wrap a JSON success body in a NextResponse with a sensible default
 *  Cache-Control so auth + user data are never accidentally cached. */
export function json<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export function error(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return json({ error: { code, message, ...extra } }, { status });
}

export function zodError(err: ZodError) {
  return error(400, "validation_error", "Invalid request body.", {
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

export type UserResponse = { user: PublicUser };
