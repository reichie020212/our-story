"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENRES, LENGTHS } from "@/data/stories";
import { useAuth } from "./AuthProvider";
import { apiSend, ApiCallError } from "@/lib/client/api";
import type { StoryWire } from "@/lib/story";

type Status = "draft" | "saving" | "saved" | "publishing" | "published";
type Format = { bold: boolean; italic: boolean; underline: boolean };

export function Composer() {
  const router = useRouter();
  const { user } = useAuth();
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storySlug, setStorySlug] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [body, setBody] = useState("");
  const [genre, setGenre] = useState("literary");
  const [length, setLength] = useState("flash");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [error, setError] = useState("");
  const [activeFormat, setActiveFormat] = useState<Format>({
    bold: false,
    italic: false,
    underline: false,
  });

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 220));

  const bodyParagraphs = () =>
    body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

  const buildPayload = () => ({
    title: title.trim(),
    synopsis: synopsis.trim(),
    body: bodyParagraphs(),
    genre,
    length,
    tags,
  });

  const saveDraft = async () => {
    if (!title.trim() && !body.trim()) return;
    setStatus("saving");
    setError("");
    try {
      if (storyId) {
        const data = await apiSend<{ story: StoryWire }>(
          `/api/v1/stories/${storyId}`,
          "PATCH",
          buildPayload(),
        );
        setStorySlug(data.story.slug);
      } else {
        const data = await apiSend<{ story: StoryWire }>(
          "/api/v1/stories",
          "POST",
          buildPayload(),
        );
        setStoryId(data.story.id);
        setStorySlug(data.story.slug);
      }
      setStatus("saved");
    } catch (err) {
      setStatus("draft");
      setError(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't save. Please try again.",
      );
    }
  };

  const publish = async () => {
    setError("");
    // Make sure the latest body is on the server before flipping to published.
    if (
      !storyId ||
      status === "saving" ||
      status === "draft" ||
      status === "published"
    ) {
      await saveDraft();
    }
    if (!storyId) return; // saveDraft would have set an error
    setStatus("publishing");
    try {
      const data = await apiSend<{ story: StoryWire }>(
        `/api/v1/stories/${storyId}/publish`,
        "POST",
      );
      setStatus("published");
      router.push(`/s/${data.story.slug}`);
    } catch (err) {
      setStatus("saved");
      setError(
        err instanceof ApiCallError
          ? err.message
          : "Couldn't publish. Please try again.",
      );
    }
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!tags.includes(t)) setTags([...tags, t]);
      setTagInput("");
      e.preventDefault();
    }
  };

  const TB = ({
    cmd,
    children,
    title,
  }: {
    cmd: keyof Format;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      title={title}
      className={activeFormat[cmd] ? "active" : ""}
      onClick={() =>
        setActiveFormat({ ...activeFormat, [cmd]: !activeFormat[cmd] })
      }
    >
      {children}
    </button>
  );

  return (
    <section className="composer" data-screen-label="04 Composer">
      <div className="composer-head">
        <h2>
          Write a <em>new</em> story.
        </h2>
        <div className="actions">
          {user && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--ink-soft)",
                marginRight: 6,
              }}
            >
              <span className="user-avatar">{user.initial}</span>
              <span>
                as{" "}
                <b style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {user.name}
                </b>
              </span>
            </span>
          )}
          <span
            className={`status-pill ${status === "saved" || status === "published" ? "saved" : ""}`}
          >
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "✓ Saved"
                : status === "publishing"
                  ? "Publishing…"
                  : status === "published"
                    ? "Published ✓"
                    : "Draft"}
          </span>
          <button
            className="btn-ghost btn"
            onClick={saveDraft}
            disabled={status === "saving" || status === "publishing"}
          >
            Save draft
          </button>
          <button
            className="btn-ghost btn"
            onClick={() => storySlug && router.push(`/s/${storySlug}`)}
            disabled={!storySlug}
          >
            Preview
          </button>
          <button
            className="btn"
            onClick={publish}
            disabled={status === "saving" || status === "publishing"}
          >
            {status === "published" ? "Published ✓" : "Publish"}
          </button>
        </div>
      </div>
      {error && (
        <div
          className="auth-error"
          style={{ marginBottom: 16, maxWidth: 720 }}
        >
          {error}
        </div>
      )}
      <div className="composer-grid">
        <div className="editor">
          <div className="toolbar">
            <TB cmd="bold" title="Bold">
              <b>B</b>
            </TB>
            <TB cmd="italic" title="Italic">
              <i>I</i>
            </TB>
            <TB cmd="underline" title="Underline">
              <u>U</u>
            </TB>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                alignSelf: "center",
              }}
            >
              {wordCount} words · {readTime} min read
            </div>
          </div>
          <input
            className="title"
            placeholder="Title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="synopsis"
            placeholder="One-sentence synopsis (shown on the story card)"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={2}
          />
          <textarea
            className="body"
            placeholder={`Start with a sentence that a reader can't walk away from.\n\nFor example:\n"One ordinary day, I was playing with my friends when a blinding light came out of nowhere and consumed me…"`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
          />
        </div>
        <aside className="composer-side">
          <div className="side-panel">
            <h4>Classification</h4>
            <div className="field">
              <label>Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
              >
                {LENGTHS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.sub}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tags</label>
              <div className="tag-input-wrap">
                {tags.map((t) => (
                  <span key={t} className="tag-pill">
                    #{t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  placeholder={tags.length === 0 ? "type + enter" : ""}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              </div>
            </div>
          </div>
          <div className="side-panel">
            <h4>Visibility</h4>
            <div className="field">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="vis" defaultChecked /> Public — anyone
                can read
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="vis" /> Unlisted — only with link
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input type="radio" name="vis" /> Private — only you
              </label>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
