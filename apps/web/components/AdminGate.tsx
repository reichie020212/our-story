"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";

/** Client-side gate for /admin/* pages. This is UX only — every admin API
 *  route enforces the role server-side via requireAdmin(). Renders a
 *  loading / sign-in / not-authorized state, or the children for admins. */
export function AdminGate({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, loading, setModal } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          padding: "80px 20px",
          textAlign: "center",
          color: "var(--ink-mute)",
          fontFamily: "var(--mono)",
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, margin: 0 }}>
          {title}
        </h2>
        <p style={{ color: "var(--ink-mute)", margin: "12px 0 20px" }}>
          Sign in to continue.
        </p>
        <button className="btn" onClick={() => setModal("signin")}>
          Sign in
        </button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, margin: 0 }}>
          Admins only
        </h2>
        <p style={{ color: "var(--ink-mute)", margin: "12px 0 0" }}>
          You don&apos;t have access to this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
