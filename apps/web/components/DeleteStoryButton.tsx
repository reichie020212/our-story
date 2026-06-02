"use client";

import { useState } from "react";
import { apiSend, ApiCallError } from "@/lib/client/api";
import { ConfirmModal } from "./ConfirmModal";

/**
 * A delete affordance for a single story: renders a trigger (its own
 * `children`/`className`, so it can be a card-corner icon, a reader
 * icon-button, or a full composer button) that opens a confirmation
 * dialog, then soft-deletes via `DELETE /api/v1/stories/{idOrSlug}`.
 *
 * Authorization is enforced server-side (author or superadmin). Callers
 * should still gate rendering on the same check so the button only shows
 * to people who can actually use it.
 */
export function DeleteStoryButton({
  idOrSlug,
  title,
  onDeleted,
  className,
  triggerTitle,
  children,
  stopPropagation = false,
}: {
  idOrSlug: string;
  title: string;
  onDeleted: () => void;
  className?: string;
  triggerTitle?: string;
  children: React.ReactNode;
  /** Stop the click bubbling to a parent handler (e.g. a clickable card). */
  stopPropagation?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiSend(`/api/v1/stories/${idOrSlug}`, "DELETE");
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't delete the story. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        className={className}
        title={triggerTitle}
        aria-label={triggerTitle}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <ConfirmModal
        open={open}
        busy={busy}
        title="Delete this story?"
        confirmLabel="Delete story"
        message={
          <>
            <p>
              <b>“{title || "Untitled draft"}”</b> will be permanently removed
              from OurStory. This can’t be undone.
            </p>
            {error && (
              <p className="auth-error" style={{ margin: "12px 0 0" }}>
                {error}
              </p>
            )}
          </>
        }
        onConfirm={confirm}
        onCancel={close}
      />
    </>
  );
}

/** Trash glyph shared by the icon-style triggers (cards, reader). */
export function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}
