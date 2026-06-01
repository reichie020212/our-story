"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { GENRES, LENGTHS } from "@/data/stories";
import { apiGet } from "@/lib/client/api";
import type { StoryWire } from "@/lib/story";
import { useAuth } from "./AuthProvider";

type FilterMode = "all" | "published" | "draft";

type Props = {
  title: string;
  subtitle: string;
  endpoint: string;
  filterMode?: FilterMode;
  emptyMessage: string;
};

export function StoryListPage({
  title,
  subtitle,
  endpoint,
  filterMode = "all",
  emptyMessage,
}: Props) {
  const { user, loading: authLoading, setModal } = useAuth();
  const [stories, setStories] = useState<StoryWire[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<{ stories: StoryWire[] }>(endpoint)
      .then((data) => {
        if (cancelled) return;
        setStories(data.stories);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load stories.",
        );
        setStories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, user, authLoading]);

  const filtered = useMemo(() => {
    if (!stories) return [];
    if (filterMode === "published")
      return stories.filter((s) => s.status === "published");
    if (filterMode === "draft")
      return stories.filter((s) => s.status !== "published");
    return stories;
  }, [stories, filterMode]);

  if (authLoading) {
    return <Centered>loading…</Centered>;
  }

  if (!user) {
    return (
      <div className="grid-wrap" style={{ gridTemplateColumns: "1fr" }}>
        <div
          style={{
            padding: "80px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, margin: 0 }}>
            {title}
          </h2>
          <p
            style={{
              color: "var(--ink-mute)",
              margin: "12px 0 20px",
            }}
          >
            Sign in to see your library.
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
      <div>
        <div style={{ padding: "16px 0 24px" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: 0 }}>
            {title}
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
            {loading ? "loading…" : subtitle}
          </p>
        </div>
        <div className="story-grid">
          {loading && stories === null ? (
            <Centered>loading…</Centered>
          ) : filtered.length === 0 ? (
            <Centered italic>{error ?? emptyMessage}</Centered>
          ) : (
            filtered.map((s) => <StoryCardSimple key={s.id} story={s} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Centered({
  children,
  italic,
}: {
  children: React.ReactNode;
  italic?: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: "1/-1",
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--ink-mute)",
        fontFamily: italic ? "var(--serif)" : "var(--mono)",
        fontStyle: italic ? "italic" : "normal",
        fontSize: italic ? 18 : 12,
        letterSpacing: italic ? "normal" : "0.1em",
      }}
    >
      {children}
    </div>
  );
}

function StoryCardSimple({ story }: { story: StoryWire }) {
  const router = useRouter();
  const genre = GENRES.find((g) => g.id === story.genre) ?? GENRES[0];
  const length = LENGTHS.find((l) => l.id === story.length) ?? LENGTHS[0];
  const date = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "draft";
  // Badge only the non-public states (these only surface in the Drafts
  // view); published cards stay clean.
  const statusBadge =
    story.status === "pending_review"
      ? { label: "Pending review", cls: "pending-review" }
      : story.status === "rejected"
        ? { label: "Rejected", cls: "rejected" }
        : story.status === "draft"
          ? { label: "Draft", cls: "" }
          : null;
  // Non-published stories (draft / pending review / rejected) open in the
  // composer for editing + resubmission; published ones open in the reader.
  const href =
    story.status === "published"
      ? `/s/${story.slug}`
      : `/compose?edit=${story.slug}`;
  return (
    <article
      className="story-card"
      style={{ ["--genre-color" as string]: genre.color } as CSSProperties}
      onClick={() => router.push(href)}
    >
      <div className="meta-row">
        <span className="genre">
          <span className="dot"></span>
          {genre.label}
        </span>
        <span>
          {length.label} · {story.minutes} min
        </span>
      </div>
      {statusBadge && (
        <span
          className={`status-pill ${statusBadge.cls}`}
          style={{ alignSelf: "flex-start", marginBottom: 8 }}
        >
          {statusBadge.label}
        </span>
      )}
      <h3>{story.title || "Untitled draft"}</h3>
      <p className="excerpt">{story.synopsis || "No synopsis yet."}</p>
      {story.status === "rejected" && story.rejectionReason && (
        <p className="reject-reason">
          <b>Editor&apos;s note:</b> {story.rejectionReason}
        </p>
      )}
      <div className="tags">
        {story.tags.slice(0, 3).map((t) => (
          <span key={t}>#{t}</span>
        ))}
      </div>
      <div className="footer">
        <span>
          By{" "}
          <b style={{ color: "var(--ink)", fontWeight: 500 }}>
            {story.author.name}
          </b>{" "}
          · {date}
        </span>
        <div className="stats">
          <span>
            {story.views > 999
              ? (story.views / 1000).toFixed(1) + "k"
              : story.views}{" "}
            reads
          </span>
          <span>{story.likes} likes</span>
        </div>
      </div>
    </article>
  );
}
