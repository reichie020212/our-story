"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * A small, generic confirmation dialog for destructive actions. Rendered
 * through a portal to `document.body` so it escapes any positioned/
 * transformed ancestor (e.g. a story card, which gets a `transform` on
 * hover and would otherwise become the containing block for the fixed
 * overlay). Reuses the `.auth-overlay` backdrop + `.btn`/`.btn-danger`
 * styles already in globals.css.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busyLabel = "Deleting…",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="auth-overlay"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
