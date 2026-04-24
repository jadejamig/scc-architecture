/**
 * Browser fetch to same-origin API routes: include cookies (session) reliably.
 */
export const apiFetchInit: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

function messageFromErrorBody(text: string, status: number): string {
  if (!text.trim()) {
    return `Request failed (HTTP ${status}, empty body).`;
  }
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    return j.error ?? j.message ?? `Request failed (HTTP ${status})`;
  } catch {
    const t = text.trim();
    if (t.length > 0 && t.length < 400) {
      return t;
    }
    return `Request failed (HTTP ${status})`;
  }
}

/** Thrown after navigating to /login on 401 so callers can avoid showing a stale error UI. */
export class RedirectingToLoginError extends Error {
  constructor() {
    super("Redirecting to sign in");
    this.name = "RedirectingToLoginError";
  }
  static is(e: unknown): e is RedirectingToLoginError {
    return e instanceof RedirectingToLoginError;
  }
}

/**
 * Read JSON from a fetch Response. Avoids "Unexpected end of JSON input" when the
 * body is empty or not JSON. On 401, redirects the browser to `/login` then throws
 * `RedirectingToLoginError` (ignore in UI; navigation is in progress).
 */
export async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.replace(
          new URL(
            "/login",
            window.location.origin,
          ).toString(),
        );
      }
      throw new RedirectingToLoginError();
    }
    throw new Error(messageFromErrorBody(text, res.status));
  }
  if (!text.trim()) {
    throw new Error("Empty response from server (expected JSON).");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned a non-JSON response.");
  }
}
