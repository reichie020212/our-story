"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function UserMenu() {
  const router = useRouter();
  const { user, signOut, setModal } = useAuth();
  const [open, setOpen] = useState(false);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(
      () => document.addEventListener("click", close, { once: true }),
      0,
    );
    return () => clearTimeout(t);
  }, [open]);

  if (!user) {
    return (
      <div className="auth-ctrls">
        <button
          className="btn-ghost btn auth-signin"
          onClick={() => setModal("signin")}
        >
          Sign in
        </button>
        <button className="btn auth-signup" onClick={() => setModal("signup")}>
          <span className="pen">✎</span> Start writing
        </button>
      </div>
    );
  }
  return (
    <div className="user-menu-wrap">
      <button
        className="user-chip"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span className="user-avatar">{user.initial}</span>
        <span className="user-name">{user.name}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="user-menu" onClick={(e) => e.stopPropagation()}>
          <div className="um-head">
            <div className="user-avatar lg">{user.initial}</div>
            <div>
              <b>{user.name}</b>
              <span>{user.handle}</span>
            </div>
          </div>
          <div className="um-list">
            <button onClick={() => go("/me/stories")}>My stories</button>
            <button onClick={() => go("/me/drafts")}>Drafts</button>
            <button onClick={() => go("/me/bookmarks")}>Bookmarks</button>
            <button onClick={() => go("/settings")}>Settings</button>
          </div>
          {user.role === "admin" && (
            <>
              <div className="um-sep"></div>
              <div className="um-list">
                <button onClick={() => go("/admin/review")}>
                  Review queue
                </button>
                <button onClick={() => go("/admin")}>Admin settings</button>
              </div>
            </>
          )}
          <div className="um-sep"></div>
          <button
            className="um-signout"
            onClick={() => {
              signOut();
              setOpen(false);
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
