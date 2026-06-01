"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiCallError, apiGet, apiSend } from "@/lib/client/api";
import type { StoryListNoCursorResponse, StoryWire } from "@our-story/api-types";
import { AdminGate } from "@/components/AdminGate";

export default function ReviewQueuePage() {
  return (
    <AdminGate title="Review queue">
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ maxWidth: 820, width: "100%" }}>
          <Queue />
        </div>
      </div>
    </AdminGate>
  );
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Queue() {
  const [stories, setStories] = useState<StoryWire[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<StoryListNoCursorResponse>("/api/v1/admin/review-queue")
      .then((data) => {
        if (!cancelled) setStories(data.stories);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load queue.");
          setStories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = (id: string) =>
    setStories((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));

  return (
    <>
      <div style={{ padding: "16px 0 24px" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: 0 }}>
          Review queue
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
          {stories === null
            ? "loading…"
            : `${stories.length} awaiting review`}{" "}
          · <Link href="/admin">back to admin</Link>
        </p>
      </div>

      {stories !== null && stories.length === 0 ? (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--ink-mute)",
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: 18,
          }}
        >
          {error ?? "Nothing waiting — the queue is clear."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(stories ?? []).map((s) => (
            <ReviewCard key={s.id} story={s} onResolved={() => remove(s.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function ReviewCard({
  story,
  onResolved,
}: {
  story: StoryWire;
  onResolved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/stories/${story.id}/approve`, "POST");
      onResolved();
    } catch (err) {
      setError(err instanceof ApiCallError ? err.message : "Couldn't approve.");
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setError("Give the author a reason.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/stories/${story.id}/reject`, "POST", {
        reason: reason.trim(),
      });
      onResolved();
    } catch (err) {
      setError(err instanceof ApiCallError ? err.message : "Couldn't reject.");
      setBusy(false);
    }
  };

  return (
    <article className="admin-review-card">
      <div className="admin-review-head">
        <div>
          <h3>{story.title || "Untitled"}</h3>
          <p className="admin-review-byline">
            by {story.author.name} {story.author.handle}
          </p>
        </div>
        <Link
          className="btn-ghost btn"
          href={`/s/${story.slug}`}
          target="_blank"
        >
          Open preview ↗
        </Link>
      </div>

      <p className="admin-review-synopsis">
        {story.synopsis || "No synopsis."}
      </p>

      <dl className="admin-review-meta">
        <div>
          <dt>Created</dt>
          <dd>{fmt(story.createdAt)}</dd>
        </div>
        <div>
          <dt>Last edited</dt>
          <dd>{fmt(story.updatedAt)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{fmt(story.submittedForReviewAt)}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{story.minutes} min</dd>
        </div>
      </dl>

      {error && (
        <div className="auth-error" style={{ marginTop: 4 }}>
          {error}
        </div>
      )}

      {rejecting ? (
        <div className="admin-review-reject">
          <textarea
            placeholder="Why is this being rejected? The author will see this."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={busy}
          />
          <div className="admin-review-actions">
            <button
              className="btn-ghost btn"
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn btn-danger" onClick={reject} disabled={busy}>
              {busy ? "Rejecting…" : "Confirm rejection"}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-review-actions">
          <button
            className="btn-ghost btn"
            onClick={() => setRejecting(true)}
            disabled={busy}
          >
            Reject…
          </button>
          <button className="btn" onClick={approve} disabled={busy}>
            {busy ? "Approving…" : "Approve & publish"}
          </button>
        </div>
      )}
    </article>
  );
}
