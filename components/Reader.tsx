"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { GENRES } from "@/data/stories";
import { useAuth } from "@/components/AuthProvider";
import { apiSend } from "@/lib/client/api";
import type { StoryWire } from "@/lib/story";

const FALLBACK_BODY = (story: StoryWire) => [
  `(Preview) ${story.synopsis}`,
  "This story's full text hasn't been written yet — but its shape is here: the title, the cover, the voice. When the author hits publish, every word will appear in this exact reading view, with the same type, margins, and ribbon-at-the-top progress indicator you're using now.",
  "Consider this the room where words will arrive.",
];

export function Reader({
  story,
  signedIn,
}: {
  story: StoryWire;
  signedIn: boolean;
}) {
  const { setModal } = useAuth();
  const genre = GENRES.find((g) => g.id === story.genre) ?? GENRES[0];
  const [liked, setLiked] = useState(!!story.liked);
  const [bookmarked, setBookmarked] = useState(!!story.bookmarked);
  const [likeCount, setLikeCount] = useState(story.likes);
  const [pending, setPending] = useState<"like" | "bookmark" | null>(null);

  // Remember the last-read story so the topbar's "Reading" can return.
  useEffect(() => {
    try {
      localStorage.setItem("os-story", story.slug);
    } catch {
      /* ignore */
    }
  }, [story.slug]);

  // Reset local UI state when the underlying story changes (route navigation).
  useEffect(() => {
    setLiked(!!story.liked);
    setBookmarked(!!story.bookmarked);
    setLikeCount(story.likes);
  }, [story.id, story.liked, story.bookmarked, story.likes]);

  // Reading progress ribbon
  useEffect(() => {
    const ribbon = document.getElementById("ribbon");
    const handler = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const total = doc.scrollHeight - window.innerHeight;
      const pct =
        total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
      if (ribbon) ribbon.style.width = pct + "%";
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => {
      window.removeEventListener("scroll", handler);
      if (ribbon) ribbon.style.width = "0";
    };
  }, [story.id]);

  const toggleLike = async () => {
    if (pending) return;
    if (!signedIn) {
      setModal({ mode: "signup", reason: "write" });
      return;
    }
    const next = !liked;
    setPending("like");
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    try {
      const data = await apiSend<{ liked: boolean; likeCount: number }>(
        `/api/v1/stories/${story.slug}/like`,
        next ? "POST" : "DELETE",
      );
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      // Roll back on failure.
      setLiked(!next);
      setLikeCount((c) => (next ? Math.max(0, c - 1) : c + 1));
    } finally {
      setPending(null);
    }
  };

  const toggleBookmark = async () => {
    if (pending) return;
    if (!signedIn) {
      setModal({ mode: "signup", reason: "write" });
      return;
    }
    const next = !bookmarked;
    setPending("bookmark");
    setBookmarked(next);
    try {
      await apiSend(
        `/api/v1/stories/${story.slug}/bookmark`,
        next ? "POST" : "DELETE",
      );
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(null);
    }
  };

  const body = story.body.length > 0 ? story.body : FALLBACK_BODY(story);
  const date = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const midIndex = Math.floor(body.length / 2);

  return (
    <article className="reader" data-screen-label="03 Reader">
      <Link href="/" className="back">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        back to library
      </Link>
      <div className="genre-line" style={{ color: genre.color }}>
        <span className="dot"></span>
        {genre.label} · {story.minutes} min read
      </div>
      <h1>{story.title}</h1>
      <p className="synopsis">{story.synopsis}</p>
      <div className="author-row">
        <div className="avatar">{story.author.initial}</div>
        <div className="author-meta">
          <b>{story.author.name}</b>
          <span>
            {date ? `${date} · ` : ""}
            {story.views.toLocaleString()} reads
          </span>
        </div>
        <div className="read-actions">
          <button
            className={`icon-btn ${liked ? "active" : ""}`}
            title="Like"
            onClick={toggleLike}
            disabled={pending === "like"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </button>
          <button
            className={`icon-btn ${bookmarked ? "active" : ""}`}
            title="Bookmark"
            onClick={toggleBookmark}
            disabled={pending === "bookmark"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
          </button>
          <button className="icon-btn" title="Share">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </button>
        </div>
      </div>
      <div className="reader-body">
        {body.map((para, i) => {
          const text = String(para);
          const isHeartbeat = /^duh dum/i.test(text) && text.length < 40;
          if (isHeartbeat)
            return (
              <p key={i} className="heartbeat-line">
                {text}
              </p>
            );
          if (i === midIndex) {
            return (
              <Fragment key={i}>
                <p>{text}</p>
                <div className="ad ad-midstory">300 × 250 · Mid-Story Ad</div>
              </Fragment>
            );
          }
          return <p key={i}>{text}</p>;
        })}
      </div>
      <div className="reader-footer">
        <div className="end-mark">· · ·</div>
        <div className="applause">
          <button
            className={liked ? "active" : ""}
            onClick={toggleLike}
            disabled={pending === "like"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
            {likeCount} claps
          </button>
          <button>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Leave a note
          </button>
          <button>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
        </div>
      </div>
    </article>
  );
}
