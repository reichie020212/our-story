"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiCallError, apiGet, apiSend } from "@/lib/client/api";
import type { AppSettingsResponse } from "@our-story/api-types";
import { AdminGate } from "@/components/AdminGate";

export default function AdminPage() {
  return (
    <AdminGate title="Admin">
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ maxWidth: 680, width: "100%" }}>
          <Header />
          <ApprovalToggle />
          <nav className="admin-links">
            <Link href="/admin/review">Review queue →</Link>
            <Link href="/admin/users">Manage users →</Link>
          </nav>
        </div>
      </div>
    </AdminGate>
  );
}

function Header() {
  return (
    <div style={{ padding: "16px 0 24px" }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: 0 }}>
        Admin
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
        Platform settings &amp; moderation
      </p>
    </div>
  );
}

function ApprovalToggle() {
  const [approvalRequired, setApprovalRequired] = useState<boolean | null>(
    null,
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<AppSettingsResponse>("/api/v1/admin/settings")
      .then((data) => {
        if (!cancelled) setApprovalRequired(data.settings.approvalRequired);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Couldn't load settings.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (approvalRequired === null || status === "saving") return;
    const next = !approvalRequired;
    setStatus("saving");
    setError(null);
    try {
      const data = await apiSend<AppSettingsResponse>(
        "/api/v1/admin/settings",
        "PATCH",
        { approvalRequired: next },
      );
      setApprovalRequired(data.settings.approvalRequired);
    } catch (err) {
      setError(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't update the setting.",
      );
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-row">
        <div>
          <h4>Require approval before publishing</h4>
          <p>
            When on, writers can&apos;t publish directly — they{" "}
            <b>send stories for approval</b> and an admin reviews them in the{" "}
            queue. When off, writers publish on their own (the default).
            Admins always publish directly either way.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={approvalRequired ?? false}
          className={`admin-switch ${approvalRequired ? "on" : ""}`}
          onClick={toggle}
          disabled={approvalRequired === null || status === "saving"}
        >
          <span className="admin-switch-knob" />
        </button>
      </div>
      <div className="admin-panel-state">
        {approvalRequired === null
          ? "Loading…"
          : approvalRequired
            ? "Approval is ON — new stories go to the review queue."
            : "Approval is OFF — writers publish directly."}
      </div>
      {error && (
        <div className="auth-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
