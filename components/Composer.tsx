"use client";

import { useState } from "react";
import { GENRES, LENGTHS } from "@/data/stories";
import { useAuth } from "./AuthProvider";

type Status = "draft" | "saving" | "saved" | "published";
type Format = { bold: boolean; italic: boolean; underline: boolean };

export function Composer() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [body, setBody] = useState("");
  const [genre, setGenre] = useState("literary");
  const [length, setLength] = useState("flash");
  const [tags, setTags] = useState<string[]>(["memory", "first-person"]);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [activeFormat, setActiveFormat] = useState<Format>({
    bold: false,
    italic: false,
    underline: false,
  });

  const saveDraft = () => {
    if (!title && !body) return;
    setStatus("saving");
    // Backend wiring (commit 9) will call PATCH /api/v1/stories/:id here.
    setTimeout(() => setStatus("saved"), 600);
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 220));

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
            className={`status-pill ${status === "saved" ? "saved" : ""}`}
          >
            {status === "saving"
              ? "Saving…"
              : status === "saved"
                ? "✓ Saved"
                : status === "published"
                  ? "Published ✓"
                  : "Draft"}
          </span>
          <button className="btn-ghost btn" onClick={saveDraft}>
            Save draft
          </button>
          <button className="btn-ghost btn">Preview</button>
          <button className="btn" onClick={() => setStatus("published")}>
            {status === "published" ? "Published ✓" : "Publish"}
          </button>
        </div>
      </div>
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
          <div
            className="side-panel"
            style={{
              background: "var(--bg-sunk)",
              borderStyle: "dashed",
            }}
          >
            <h4 style={{ marginBottom: 8 }}>Danger Zone</h4>
            <button
              style={{
                fontSize: 12,
                color: "var(--ink-mute)",
                textDecoration: "underline",
              }}
            >
              Delete draft
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
