"use client";

import { useRouter } from "next/navigation";
import { useAuth, type AuthReason } from "./AuthProvider";

export function GatedNotice({ action = "write" }: { action?: AuthReason }) {
  const { setModal } = useAuth();
  const router = useRouter();
  return (
    <section className="gated">
      <div className="gated-card">
        <div className="gated-glyph">✎</div>
        <h2>A seat at the writing desk</h2>
        <p>
          Writing on OurStory is for signed-in authors — it&apos;s how we keep
          the library honest and your drafts safe across devices. Reading is,
          and always will be, anonymous and free.
        </p>
        <div className="gated-actions">
          <button
            className="btn"
            onClick={() => setModal({ mode: "signup", reason: action })}
          >
            Create an account
          </button>
          <button
            className="btn-ghost btn"
            onClick={() => setModal({ mode: "signin", reason: action })}
          >
            I already have one
          </button>
        </div>
        <button className="gated-back" onClick={() => router.push("/")}>
          ← back to reading
        </button>
      </div>
    </section>
  );
}
