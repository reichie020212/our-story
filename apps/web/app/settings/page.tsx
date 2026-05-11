"use client";

import { useAuth } from "@/components/AuthProvider";

export default function SettingsPage() {
  const { user, loading, setModal, signOut } = useAuth();

  if (loading) {
    return (
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
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
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, margin: 0 }}>
            Settings
          </h2>
          <p style={{ color: "var(--ink-mute)", margin: "12px 0 20px" }}>
            Sign in to manage your account.
          </p>
          <button className="btn" onClick={() => setModal("signin")}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ padding: "16px 0 24px" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: 0 }}>
            Settings
          </h2>
          <p
            style={{
              color: "var(--ink-mute)",
              margin: "6px 0 0",
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Account
          </p>
        </div>

        <div
          className="panel"
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 16,
          }}
        >
          <Row label="Display name" value={user.name} />
          <Row label="Handle" value={user.handle} />
          <Row label="Email" value={user.email} />
        </div>

        <p
          style={{
            color: "var(--ink-mute)",
            fontSize: 13,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
            margin: "0 0 24px",
          }}
        >
          Editable account settings are coming soon.
        </p>

        <button
          className="btn btn-ghost"
          onClick={() => signOut()}
          style={{ color: "var(--ink-soft)" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--rule)",
        alignItems: "center",
      }}
    >
      <span
        style={{
          color: "var(--ink-mute)",
          fontFamily: "var(--mono)",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{value}</span>
    </div>
  );
}
