// Tiny client-side fetch helper. Throws on non-2xx with the server's
// `error.message` if the response was JSON, otherwise a generic note
// keyed off the status code. Always sends cookies (same-origin) so
// the session cookie ride along.

type ApiError = { error: { code: string; message: string } };

export class ApiCallError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ApiCallError> {
  let body: ApiError | null = null;
  try {
    body = (await res.json()) as ApiError;
  } catch {
    /* not JSON — fall through to the generic message */
  }
  return new ApiCallError(
    res.status,
    body?.error?.code ?? "request_failed",
    body?.error?.message ?? `Request failed (${res.status}).`,
  );
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
