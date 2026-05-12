"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type User = {
  id: string;
  email: string;
  name: string;
  initial: string;
  handle: string;
};

export type AuthReason = "write" | null;
export type AuthMode = "signin" | "signup";
export type AuthModalState =
  | null
  | AuthMode
  | { mode: AuthMode; reason?: AuthReason };

// Signup now goes to a "check your email" gate instead of producing
// a signed-in user. We model that as a distinct result so callers can
// branch on it; only success means the user is actually authenticated.
type SignUpResult =
  | { kind: "signed_in"; user: User }
  | { kind: "verification_sent"; email: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  modal: AuthModalState;
  setModal: (state: AuthModalState) => void;
  requireAuth: (action?: AuthReason) => boolean;
  applyUser: (user: User) => void;
  resendVerification: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

type ApiError = {
  error: {
    code: string;
    message: string;
    email?: string;
    issues?: { path: string; message: string }[];
  };
};

// Error wrapper that keeps the server's stable `code` around so the
// modal can branch on email_not_verified vs. invalid_credentials.
class AuthApiError extends Error {
  code: string;
  email?: string;
  constructor(code: string, message: string, email?: string) {
    super(message);
    this.code = code;
    this.email = email;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    const first = data?.error?.issues?.[0];
    const detail = first
      ? `${humanField(first.path)}: ${first.message}`
      : null;
    throw new AuthApiError(
      data?.error?.code ?? "request_failed",
      detail ?? data?.error?.message ?? `Request failed (${res.status}).`,
      data?.error?.email,
    );
  }
  return (await res.json()) as T;
}

function humanField(path: string): string {
  if (path === "name") return "Display name";
  if (path === "email") return "Email";
  if (path === "password") return "Password";
  return path || "Field";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<AuthModalState>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/me", { credentials: "same-origin" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { user: User };
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user } = await postJson<{ user: User }>("/api/v1/auth/signin", {
      email,
      password,
    });
    setUser(user);
    return user;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<SignUpResult> => {
      const data = await postJson<
        { user: User } | { user: User; verificationRequired: true }
      >("/api/v1/auth/signup", { email, password, name });
      if ("verificationRequired" in data && data.verificationRequired) {
        // Don't set the user — they need to click the email link first.
        return { kind: "verification_sent", email: data.user.email };
      }
      // Legacy shape fallback (e.g. response cached from before the v1.1
      // change). Treat it as a successful sign-in.
      setUser(data.user);
      return { kind: "signed_in", user: data.user };
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/v1/auth/signout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const requireAuth = useCallback(
    (action: AuthReason = "write") => {
      if (user) return true;
      setModal({ mode: "signup", reason: action });
      return false;
    },
    [user],
  );

  const applyUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await postJson<{ ok: true }>("/api/v1/auth/resend-verification", {
      email,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      modal,
      setModal,
      requireAuth,
      applyUser,
      resendVerification,
    }),
    [
      user,
      loading,
      signIn,
      signUp,
      signOut,
      modal,
      requireAuth,
      applyUser,
      resendVerification,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal />
    </AuthContext.Provider>
  );
}

type ModalPhase =
  | { kind: "form" }
  | { kind: "verification_sent"; email: string }
  | { kind: "needs_verification"; email: string };

function AuthModal() {
  const { modal, setModal, signIn, signUp, resendVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>({ kind: "form" });
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    if (modal) {
      setEmail("");
      setPassword("");
      setName("");
      setError("");
      setSubmitting(false);
      setPhase({ kind: "form" });
      setResendStatus("idle");
    }
  }, [modal]);

  if (!modal) return null;
  const mode = typeof modal === "string" ? modal : modal.mode;
  const reason = typeof modal === "object" ? modal.reason ?? null : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (mode === "signup" && !name.trim())
      return setError("What should we call you?");
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const result = await signUp(email, password, name);
        if (result.kind === "verification_sent") {
          setPhase({ kind: "verification_sent", email: result.email });
          return;
        }
        setModal(null);
      } else {
        await signIn(email, password);
        setModal(null);
      }
    } catch (err) {
      if (err instanceof AuthApiError && err.code === "email_not_verified") {
        // Signin against an unverified account — pivot to the resend
        // panel using whatever email the server echoed back (falls back
        // to the form's email).
        setPhase({
          kind: "needs_verification",
          email: err.email ?? email,
        });
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (m: AuthMode) =>
    setModal(typeof modal === "object" ? { ...modal, mode: m } : m);

  const triggerResend = async (target: string) => {
    setResendStatus("sending");
    try {
      await resendVerification(target);
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  };

  return (
    <div className="auth-overlay" onClick={() => setModal(null)}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="auth-close"
          onClick={() => setModal(null)}
          aria-label="close"
        >
          ×
        </button>
        <div className="auth-aside">
          <div className="auth-mark">
            <span className="dot"></span>
            OurStory
          </div>
          <blockquote>
            “Every story starts with someone deciding it was worth writing
            down.”
          </blockquote>
          <div className="auth-quote-attr">— the OurStory welcome card</div>
          <ul className="auth-perks">
            <li>
              <span>✎</span>Write &amp; publish original stories
            </li>
            <li>
              <span>❤</span>Save favorites across devices
            </li>
            <li>
              <span>✦</span>Follow authors you love
            </li>
            <li>
              <span>⎯</span>Reading stays free &amp; anonymous
            </li>
          </ul>
        </div>
        <div className="auth-body">
          {phase.kind === "verification_sent" ? (
            <VerificationSentPanel
              email={phase.email}
              resendStatus={resendStatus}
              onResend={() => triggerResend(phase.email)}
              onDone={() => setModal(null)}
            />
          ) : phase.kind === "needs_verification" ? (
            <NeedsVerificationPanel
              email={phase.email}
              resendStatus={resendStatus}
              onResend={() => triggerResend(phase.email)}
              onBack={() => setPhase({ kind: "form" })}
            />
          ) : (
            <>
              <div className="auth-head">
                <h2>
                  {mode === "signup" ? "Start writing." : "Welcome back."}
                </h2>
                <p>
                  {reason === "write" && mode === "signup"
                    ? "You need an account to publish a story. It takes about 20 seconds."
                    : reason === "write" && mode === "signin"
                      ? "Sign in to continue writing where you left off."
                      : !reason && mode === "signup"
                        ? "Create an account to publish. Reading is always free — no login required."
                        : "Sign in to pick up where you left off."}
                </p>
              </div>
              <form onSubmit={submit} className="auth-form">
                {mode === "signup" && (
                  <label className="auth-field">
                    <span>Display name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Mara Solís"
                      autoFocus
                      disabled={submitting}
                    />
                  </label>
                )}
                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    autoFocus={mode === "signin"}
                    disabled={submitting}
                  />
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup" ? "at least 8 characters" : "••••••••"
                    }
                    disabled={submitting}
                  />
                </label>
                {error && <div className="auth-error">{error}</div>}
                <button
                  type="submit"
                  className="btn auth-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? mode === "signup"
                      ? "Creating…"
                      : "Signing in…"
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="auth-oauth">
                  <a
                    className="oauth-btn"
                    href="/api/v1/auth/oauth/google/start"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path
                        fill="#4285f4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34a853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#fbbc04"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                      />
                      <path
                        fill="#ea4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
                      />
                    </svg>
                    Continue with Google
                  </a>
                  <a
                    className="oauth-btn"
                    href="/api/v1/auth/oauth/github/start"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 .5a11.5 11.5 0 00-3.64 22.42c.58.1.79-.25.79-.56v-2.2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.3-1.68-1.3-1.68-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.55-.3-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.82 1.18 3.08 0 4.41-2.7 5.38-5.26 5.66.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.79.56A11.5 11.5 0 0012 .5z" />
                    </svg>
                    Continue with GitHub
                  </a>
                </div>
              </form>
              <div className="auth-switch">
                {mode === "signup" ? (
                  <>
                    Already writing with us?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      disabled={submitting}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      disabled={submitting}
                    >
                      Create an account
                    </button>
                  </>
                )}
              </div>
              <div className="auth-fineprint">
                Reading stories never requires an account. You only need one to
                write, publish, or save favorites.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationSentPanel({
  email,
  resendStatus,
  onResend,
  onDone,
}: {
  email: string;
  resendStatus: "idle" | "sending" | "sent" | "error";
  onResend: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <div className="auth-head">
        <h2>Check your email.</h2>
        <p>
          We sent a verification link to <b>{email}</b>. Click it to activate
          your account — the link is good for 24 hours.
        </p>
      </div>
      <div className="auth-form" style={{ gap: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={onResend}
          disabled={resendStatus === "sending" || resendStatus === "sent"}
        >
          {resendStatus === "sent"
            ? "✓ Sent — check again in a minute"
            : resendStatus === "sending"
              ? "Sending…"
              : "Resend the link"}
        </button>
        {resendStatus === "error" && (
          <div className="auth-error">
            Couldn&apos;t send a new link. Try again in a few seconds.
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onDone}
          style={{ color: "var(--ink-soft)" }}
        >
          Done — I&apos;ll check my email
        </button>
      </div>
      <div className="auth-fineprint">
        Didn&apos;t get it? Check your spam folder, or click resend above.
      </div>
    </>
  );
}

function NeedsVerificationPanel({
  email,
  resendStatus,
  onResend,
  onBack,
}: {
  email: string;
  resendStatus: "idle" | "sending" | "sent" | "error";
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="auth-head">
        <h2>Verify your email first.</h2>
        <p>
          We sent a verification link to <b>{email}</b> when you signed up.
          Click it to activate your account, then come back here to sign in.
        </p>
      </div>
      <div className="auth-form" style={{ gap: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={onResend}
          disabled={resendStatus === "sending" || resendStatus === "sent"}
        >
          {resendStatus === "sent"
            ? "✓ Sent — check your inbox"
            : resendStatus === "sending"
              ? "Sending…"
              : "Resend the link"}
        </button>
        {resendStatus === "error" && (
          <div className="auth-error">
            Couldn&apos;t send a new link. Try again in a few seconds.
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onBack}
          style={{ color: "var(--ink-soft)" }}
        >
          Back to sign in
        </button>
      </div>
    </>
  );
}
