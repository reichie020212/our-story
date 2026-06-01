"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiCallError, apiGet, apiSend } from "@/lib/client/api";
import type {
  AdminUser,
  AdminUserListResponse,
  AdminUserResponse,
} from "@our-story/api-types";
import { AdminGate } from "@/components/AdminGate";
import { useAuth } from "@/components/AuthProvider";

export default function AdminUsersPage() {
  return (
    <AdminGate title="Manage users">
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ maxWidth: 820, width: "100%" }}>
          <UserList />
        </div>
      </div>
    </AdminGate>
  );
}

function UserList() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<AdminUserListResponse>("/api/v1/admin/users")
      .then((data) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load users.");
          setUsers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setRole = async (id: string, role: "user" | "admin") => {
    setBusyId(id);
    setError(null);
    try {
      const data = await apiSend<AdminUserResponse>(
        `/api/v1/admin/users/${id}`,
        "PATCH",
        { role },
      );
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === id ? data.user : u)) : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiCallError ? err.message : "Couldn't update role.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div style={{ padding: "16px 0 24px" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: 0 }}>
          Manage users
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
          {users === null ? "loading…" : `${users.length} users`} ·{" "}
          <Link href="/admin">back to admin</Link>
        </p>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div className="admin-user-table">
        {(users ?? []).map((u) => {
          const isSelf = me?.id === u.id;
          const isAdmin = u.role === "admin";
          return (
            <div key={u.id} className="admin-user-row">
              <div className="admin-user-id">
                <b>{u.name}</b>
                <span>
                  {u.handle} · {u.email}
                </span>
              </div>
              <span
                className={`status-pill ${isAdmin ? "saved" : ""}`}
                style={{ justifySelf: "start" }}
              >
                {u.role}
              </span>
              <button
                className="btn-ghost btn"
                disabled={busyId === u.id || (isSelf && isAdmin)}
                title={
                  isSelf && isAdmin ? "You can't remove your own admin role" : ""
                }
                onClick={() => setRole(u.id, isAdmin ? "user" : "admin")}
              >
                {busyId === u.id
                  ? "Saving…"
                  : isAdmin
                    ? "Demote to user"
                    : "Promote to admin"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
