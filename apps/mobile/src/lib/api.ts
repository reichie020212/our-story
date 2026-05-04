/**
 * apiFetch — the one fetch wrapper for /api/v1/*.
 *
 * Responsibilities:
 *   1. Prepend API_BASE_URL.
 *   2. Inject `Authorization: Bearer <access>` when we have one.
 *   3. On 401, attempt a refresh exactly once (single-flight), retry
 *      the original request with the new access token, and bubble up
 *      to the auth context if refresh fails so it can sign out.
 *   4. Parse JSON responses; throw an ApiFetchError on non-2xx with
 *      the parsed error envelope when the server provided one.
 *
 * The auth context registers callbacks via `configureApi` at startup;
 * api.ts itself is otherwise stateless from the consumer's POV.
 */
import { ApiErrorSchema } from "@our-story/api-types";
import { API_BASE_URL } from "./env";

let getAccessToken: () => string | null = () => null;
let refreshAccessToken: () => Promise<string | null> = async () => null;
let onAuthFailure: () => void = () => {};

let inFlightRefresh: Promise<string | null> | null = null;

export function configureApi(opts: {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  onAuthFailure: () => void;
}) {
  getAccessToken = opts.getAccessToken;
  refreshAccessToken = opts.refresh;
  onAuthFailure = opts.onAuthFailure;
}

export class ApiFetchError extends Error {
  status: number;
  code: string;
  issues?: { path: string; message: string }[];
  constructor(
    status: number,
    code: string,
    message: string,
    issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

async function singleFlightRefresh(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAccessToken().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function parseError(res: Response): Promise<ApiFetchError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* fall through */
  }
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, issues } = parsed.data.error;
    return new ApiFetchError(res.status, code, message, issues);
  }
  return new ApiFetchError(
    res.status,
    "unknown_error",
    `HTTP ${res.status}`,
  );
}

function withAuth(init: RequestInit, token: string | null): RequestInit {
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  return fetch(url, init);
}

/** Make a request, refreshing once on 401 and retrying. Returns the
 *  parsed JSON body typed as T; throws ApiFetchError on non-2xx. */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const baseInit: RequestInit = { ...init, headers };

  let res = await rawFetch(path, withAuth(baseInit, getAccessToken()));

  if (res.status === 401) {
    const newAccess = await singleFlightRefresh();
    if (!newAccess) {
      onAuthFailure();
      throw await parseError(res);
    }
    res = await rawFetch(path, withAuth(baseInit, newAccess));
  }

  if (!res.ok) throw await parseError(res);

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Variant for unauthenticated calls (sign-in, refresh itself).
 *  Bypasses the bearer-then-401-then-refresh dance — those endpoints
 *  don't accept a bearer and would loop forever. */
export async function apiFetchAnonymous<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await rawFetch(path, { ...init, headers });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
