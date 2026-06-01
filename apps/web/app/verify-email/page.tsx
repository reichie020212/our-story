"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ApiCallError, apiSend } from "@/lib/client/api";

type Phase =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "success" }
  | { kind: "expired" }
  | { kind: "used" }
  | { kind: "invalid"; message: string };

function VerifyEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { applyUser } = useAuth();
  const token = params.get("token");
  const [phase, setPhase] = useState<Phase>(() =>
    token ? { kind: "loading" } : { kind: "missing" },
  );

  // Resend state lives separately so a click can show its own feedback
  // without overwriting the phase result the user just saw.
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendErr, setResendErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const { user } = await apiSend<{
          user: {
            id: string;
            email: string;
            name: string;
            handle: string;
            initial: string;
            role: "user" | "admin";
          };
        }>("/api/v1/auth/verify-email", "POST", { token });
        if (cancelled) return;
        applyUser(user);
        setPhase({ kind: "success" });
        // Hand off to the home screen after a beat so the user sees the
        // confirmation; falling straight through felt jarring in testing.
        setTimeout(() => router.replace("/"), 1500);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiCallError) {
          if (err.code === "verification_expired")
            setPhase({ kind: "expired" });
          else if (err.code === "verification_used")
            setPhase({ kind: "used" });
          else setPhase({ kind: "invalid", message: err.message });
        } else {
          setPhase({
            kind: "invalid",
            message: "Couldn't verify your email. Try the resend option below.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, applyUser, router]);

  const submitResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.includes("@")) {
      setResendErr("Please enter the email you signed up with.");
      return;
    }
    setResendState("sending");
    setResendErr(null);
    try {
      await apiSend<{ ok: true }>(
        "/api/v1/auth/resend-verification",
        "POST",
        { email: resendEmail.trim().toLowerCase() },
      );
      setResendState("sent");
    } catch (err) {
      setResendState("error");
      setResendErr(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't send a new link. Try again in a moment.",
      );
    }
  };

  return (
    <div
      className="grid-wrap"
      style={{ gridTemplateColumns: "1fr", maxWidth: 560 }}
    >
      <div style={{ padding: "60px 20px" }}>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 32,
            margin: "0 0 8px",
          }}
        >
          {phase.kind === "success" ? "You're verified." : "Verify your email"}
        </h1>
        <p
          style={{
            color: "var(--ink-mute)",
            margin: "0 0 28px",
            fontFamily: "var(--serif)",
            fontSize: 16,
            lineHeight: 1.55,
          }}
        >
          {phase.kind === "loading" && "Checking your verification link…"}
          {phase.kind === "success" &&
            "Welcome to OurStory. Taking you to the library…"}
          {phase.kind === "expired" &&
            "This link expired. They last 24 hours — request a fresh one below."}
          {phase.kind === "used" &&
            "This link was already used. You can sign in normally now."}
          {phase.kind === "missing" &&
            "Open the link in your verification email to confirm your address."}
          {phase.kind === "invalid" && phase.message}
        </p>

        {/* Resend form. Hidden on success/used since neither needs it. */}
        {phase.kind !== "success" && phase.kind !== "used" && (
          <form
            onSubmit={submitResend}
            className="panel"
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
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
              Resend verification email
            </span>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="you@domain.com"
              disabled={resendState === "sending"}
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
            {resendErr && (
              <div
                style={{
                  color: "#b3261e",
                  fontSize: 13,
                  fontFamily: "var(--mono)",
                }}
              >
                {resendErr}
              </div>
            )}
            {resendState === "sent" && (
              <div
                style={{
                  color: "var(--accent)",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                ✓ If that email is on file, a new link is on its way.
              </div>
            )}
            <button
              type="submit"
              className="btn"
              disabled={resendState === "sending"}
              style={
                resendState === "sending"
                  ? { opacity: 0.5, cursor: "not-allowed" }
                  : undefined
              }
            >
              {resendState === "sending" ? "Sending…" : "Send new link"}
            </button>
          </form>
        )}

        <p style={{ marginTop: 28 }}>
          <Link
            href="/"
            style={{
              color: "var(--ink-mute)",
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            ← Back to the library
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  // useSearchParams needs Suspense in app-router builds.
  return (
    <Suspense
      fallback={
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
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
