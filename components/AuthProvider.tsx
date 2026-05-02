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
  email: string;
  name: string;
  initial: string;
  handle: string;
  joined: string;
};

export type AuthReason = "write" | null;
export type AuthMode = "signin" | "signup";
export type AuthModalState =
  | null
  | AuthMode
  | { mode: AuthMode; reason?: AuthReason };

type AuthContextValue = {
  user: User | null;
  signIn: (email: string, password: string) => User;
  signUp: (email: string, password: string, name?: string) => User;
  signOut: () => void;
  modal: AuthModalState;
  setModal: (state: AuthModalState) => void;
  requireAuth: (action?: AuthReason) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const titleCase = (s: string) =>
  s.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [modal, setModal] = useState<AuthModalState>(null);

  // Hydrate user from localStorage (client only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("os-user");
      if (saved) setUser(JSON.parse(saved) as User);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("os-user", JSON.stringify(user));
    else localStorage.removeItem("os-user");
  }, [user]);

  const signIn = useCallback((email: string) => {
    const namePart = email.split("@")[0] ?? "user";
    const name = titleCase(namePart);
    const u: User = {
      email,
      name,
      initial: (name[0] ?? "U").toUpperCase(),
      handle: "@" + namePart.toLowerCase(),
      joined: new Date().toISOString(),
    };
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(
    (email: string, _password: string, name?: string) => {
      const display = name?.trim() || email.split("@")[0] || "Writer";
      const u: User = {
        email,
        name: display,
        initial: (display[0] ?? "U").toUpperCase(),
        handle: "@" + (email.split("@")[0] ?? "writer").toLowerCase(),
        joined: new Date().toISOString(),
      };
      setUser(u);
      return u;
    },
    [],
  );

  const signOut = useCallback(() => setUser(null), []);

  const requireAuth = useCallback(
    (action: AuthReason = "write") => {
      if (user) return true;
      setModal({ mode: "signup", reason: action });
      return false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signUp, signOut, modal, setModal, requireAuth }),
    [user, signIn, signUp, signOut, modal, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal />
    </AuthContext.Provider>
  );
}

function AuthModal() {
  const { modal, setModal, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (modal) {
      setEmail("");
      setPassword("");
      setName("");
      setError("");
    }
  }, [modal]);

  if (!modal) return null;
  const mode = typeof modal === "string" ? modal : modal.mode;
  const reason = typeof modal === "object" ? modal.reason ?? null : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (mode === "signup" && !name.trim())
      return setError("What should we call you?");
    if (mode === "signup") signUp(email, password, name);
    else signIn(email, password);
    setModal(null);
  };

  const switchMode = (m: AuthMode) =>
    setModal(typeof modal === "object" ? { ...modal, mode: m } : m);

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
          <div className="auth-head">
            <h2>{mode === "signup" ? "Start writing." : "Welcome back."}</h2>
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
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup" ? "at least 6 characters" : "••••••••"
                }
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn auth-submit">
              {mode === "signup" ? "Create account" : "Sign in"}
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
              <button type="button" className="oauth-btn">
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
              </button>
              <button type="button" className="oauth-btn">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .5a11.5 11.5 0 00-3.64 22.42c.58.1.79-.25.79-.56v-2.2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.3-1.68-1.3-1.68-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.55-.3-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.82 1.18 3.08 0 4.41-2.7 5.38-5.26 5.66.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.79.56A11.5 11.5 0 0012 .5z" />
                </svg>
                Continue with GitHub
              </button>
            </div>
          </form>
          <div className="auth-switch">
            {mode === "signup" ? (
              <>
                Already writing with us?{" "}
                <button type="button" onClick={() => switchMode("signin")}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button type="button" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </>
            )}
          </div>
          <div className="auth-fineprint">
            Reading stories never requires an account. You only need one to
            write, publish, or save favorites.
          </div>
        </div>
      </div>
    </div>
  );
}
