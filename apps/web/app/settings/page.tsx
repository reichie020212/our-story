"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth, type User } from "@/components/AuthProvider";
import { ApiCallError, apiSend } from "@/lib/client/api";

export default function SettingsPage() {
  const { user, loading, setModal, signOut, applyUser } = useAuth();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Seed form fields once the user is loaded (and any time the upstream
  // user changes — e.g. after another tab updates).
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setHandle(user.handle);
  }, [user]);

  if (loading) return <CenteredPanel>loading…</CenteredPanel>;

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

  const trimmedName = name.trim();
  const normalizedHandle = handle.trim().toLowerCase();
  const handleNeedsPrefix = normalizedHandle && !normalizedHandle.startsWith("@");
  const handleToSend = handleNeedsPrefix
    ? `@${normalizedHandle}`
    : normalizedHandle;

  const dirty =
    trimmedName !== user.name.trim() || handleToSend !== user.handle;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || status === "saving") return;
    setError(null);

    if (!trimmedName) {
      return setError("Display name can't be empty.");
    }
    if (!/^@[a-z0-9]+(-[a-z0-9]+)*$/.test(handleToSend)) {
      return setError(
        "Handle must look like @name — letters, numbers, and dashes only.",
      );
    }

    setStatus("saving");
    const patch: { name?: string; handle?: string } = {};
    if (trimmedName !== user.name) patch.name = trimmedName;
    if (handleToSend !== user.handle) patch.handle = handleToSend;

    try {
      const { user: updated } = await apiSend<{ user: User }>(
        "/api/v1/me",
        "PATCH",
        patch,
      );
      applyUser(updated);
      setStatus("saved");
      // Clear the "Saved" badge after a moment so a follow-up edit
      // doesn't read as "already saved".
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't save your changes. Try again.",
      );
    }
  };

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

        <form
          onSubmit={submit}
          className="panel"
          style={{
            background: "var(--bg-elev)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Field
            label="Display name"
            value={name}
            onChange={setName}
            placeholder="e.g. Mara Solís"
            disabled={status === "saving"}
          />
          <Field
            label="Handle"
            value={handle}
            onChange={setHandle}
            placeholder="@mara-solis"
            disabled={status === "saving"}
            hint="2–24 characters, letters/numbers/dashes. The leading @ is added for you."
          />
          <ReadOnlyRow label="Email" value={user.email} />

          {error && (
            <div
              style={{
                color: "#b3261e",
                fontSize: 13,
                fontFamily: "var(--mono)",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 4,
            }}
          >
            <button
              type="submit"
              className="btn"
              disabled={!dirty || status === "saving"}
              style={
                !dirty || status === "saving"
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              {status === "saving" ? "Saving…" : "Save changes"}
            </button>
            {status === "saved" && (
              <span
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                ✓ Saved
              </span>
            )}
          </div>
        </form>

        <p
          style={{
            color: "var(--ink-mute)",
            fontSize: 13,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
            margin: "0 0 24px",
          }}
        >
          Email and password updates are coming soon.
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: "10px 12px",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          fontFamily: "var(--serif)",
          fontSize: 16,
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      />
      {hint && (
        <span
          style={{
            color: "var(--ink-mute)",
            fontSize: 12,
            fontStyle: "italic",
            fontFamily: "var(--serif)",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      <div
        style={{
          padding: "10px 12px",
          border: "1px solid var(--rule)",
          borderRadius: 8,
          fontFamily: "var(--serif)",
          fontSize: 16,
          color: "var(--ink-soft)",
          background: "var(--bg)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CenteredPanel({ children }: { children: React.ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}
