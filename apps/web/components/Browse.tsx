"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GENRES, LENGTHS } from "@/data/stories";
import { apiGet } from "@/lib/client/api";
import type { StoryWire } from "@/lib/story";

type Sort = "recent" | "popular" | "loved" | "shortest";

type StoriesResponse = {
  stories: StoryWire[];
  nextCursor: string | null;
};
type FeaturedResponse = { story: StoryWire };
type TrendingResponse = { stories: StoryWire[] };
type TrendingTagsResponse = { tags: { tag: string; count: number }[] };

function HeroSkeleton() {
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div>
        <div className="eyebrow">
          <span className="pulse"></span>
          Editor&apos;s Pick · This Week
        </div>
        <h1>
          A home for <em>original</em>
          <br />
          stories, carefully kept.
        </h1>
        <p className="lede">
          OurStory is a quiet library for writers who&apos;d rather be read than
          reposted. Save your drafts, share what&apos;s ready, and let readers
          find their next favorite.
        </p>
      </div>
      <article
        className="featured-card"
        style={{ minHeight: 220, opacity: 0.55 }}
      >
        <span className="tag">Loading…</span>
      </article>
    </section>
  );
}

function Hero({ story }: { story: StoryWire }) {
  const genre = GENRES.find((g) => g.id === story.genre) ?? GENRES[0];
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div>
        <div className="eyebrow">
          <span className="pulse"></span>
          Editor&apos;s Pick · This Week
        </div>
        <h1>
          A home for <em>original</em>
          <br />
          stories, carefully kept.
        </h1>
        <p className="lede">
          OurStory is a quiet library for writers who&apos;d rather be read than
          reposted. Save your drafts, share what&apos;s ready, and let readers
          find their next favorite.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="num">1,284</span>
            <span className="lbl">Stories</span>
          </div>
          <div className="stat">
            <span className="num">312</span>
            <span className="lbl">Writers</span>
          </div>
          <div className="stat">
            <span className="num">48k</span>
            <span className="lbl">Monthly Reads</span>
          </div>
        </div>
      </div>
      <article className="featured-card">
        <div className="heartbeat">
          <span className="dot"></span>
          Live Read
        </div>
        <span
          className="tag"
          style={{
            color: genre.color,
            background: `color-mix(in srgb, ${genre.color} 12%, transparent)`,
          }}
        >
          {genre.label} · Flash Fiction
        </span>
        <h3>{story.title}</h3>
        <p className="snippet">“{story.synopsis}”</p>
        <div className="byline">
          <span>
            By <b>{story.author.name}</b>
          </span>
          <span>
            {story.minutes} min read · {story.views.toLocaleString()} reads
          </span>
        </div>
        <Link href={`/s/${story.slug}`} className="btn read-btn">
          Read the story
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </article>
    </section>
  );
}

type FiltersProps = {
  genre: string;
  setGenre: (id: string) => void;
  length: string;
  setLength: (id: string) => void;
  sort: Sort;
  setSort: (id: Sort) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  count: number | null;
  loading: boolean;
  searchTerm: string;
};

function Filters({
  genre,
  setGenre,
  length,
  setLength,
  sort,
  setSort,
  activeTag,
  setActiveTag,
  count,
  loading,
  searchTerm,
}: FiltersProps) {
  return (
    <div className="filter-bar">
      <div className="filter-title">
        <h2>
          {searchTerm ? (
            <>
              Searching for{" "}
              <em style={{ color: "var(--accent)" }}>
                &ldquo;{searchTerm}&rdquo;
              </em>
            </>
          ) : (
            "Browse the library"
          )}
        </h2>
        <span
          className="count"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {loading && (
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse 1.2s infinite",
                display: "inline-block",
              }}
            />
          )}
          {loading
            ? searchTerm
              ? "searching…"
              : "loading…"
            : `${count ?? 0} stories · updated today`}
        </span>
      </div>
      <div className="filters">
        <div className="filter-group">
          <span className="label">Genre</span>
          <button
            className={`chip ${genre === "all" ? "active" : ""}`}
            onClick={() => setGenre("all")}
          >
            All
          </button>
          {GENRES.map((g) => (
            <button
              key={g.id}
              className={`chip ${genre === g.id ? "active" : ""}`}
              onClick={() => setGenre(g.id)}
              style={
                genre === g.id
                  ? { background: g.color, borderColor: g.color, color: "#fff" }
                  : { color: g.color }
              }
            >
              <span className="dot" style={{ background: g.color }}></span>
              {g.label}
            </button>
          ))}
        </div>
        <div className="sep"></div>
        <div className="filter-group">
          <span className="label">Length</span>
          <button
            className={`chip ${length === "all" ? "active" : ""}`}
            onClick={() => setLength("all")}
          >
            Any
          </button>
          {LENGTHS.map((l) => (
            <button
              key={l.id}
              className={`chip ${length === l.id ? "active" : ""}`}
              onClick={() => setLength(l.id)}
              title={l.sub}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="sep"></div>
        <div className="filter-group" style={{ marginLeft: "auto" }}>
          <span className="label">Sort</span>
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="recent">Most recent</option>
            <option value="popular">Most read</option>
            <option value="loved">Most loved</option>
            <option value="shortest">Shortest first</option>
          </select>
        </div>
      </div>
      {activeTag && (
        <div
          style={{
            fontSize: 12,
            fontFamily: "var(--mono)",
            color: "var(--ink-mute)",
            letterSpacing: "0.05em",
          }}
        >
          Filtering by tag:{" "}
          <b style={{ color: "var(--accent)" }}>#{activeTag}</b>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              marginLeft: 8,
              color: "var(--ink-mute)",
              textDecoration: "underline",
            }}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}

function StoryCard({
  story,
  onTag,
}: {
  story: StoryWire;
  onTag: (tag: string) => void;
}) {
  const router = useRouter();
  const genre = GENRES.find((g) => g.id === story.genre) ?? GENRES[0];
  const length = LENGTHS.find((l) => l.id === story.length) ?? LENGTHS[0];
  const date = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  return (
    <article
      className="story-card"
      style={{ ["--genre-color" as string]: genre.color } as React.CSSProperties}
      onClick={() => router.push(`/s/${story.slug}`)}
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
      <h3>{story.title}</h3>
      <p className="excerpt">{story.synopsis}</p>
      <div className="tags">
        {story.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            onClick={(e) => {
              e.stopPropagation();
              onTag(t);
            }}
            style={{ cursor: "pointer" }}
          >
            #{t}
          </span>
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
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {story.views > 999
              ? (story.views / 1000).toFixed(1) + "k"
              : story.views}
          </span>
          <span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
            {story.likes}
          </span>
        </div>
      </div>
    </article>
  );
}

function Sidebar({ onTag }: { onTag: (tag: string) => void }) {
  const [trending, setTrending] = useState<StoryWire[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    apiGet<TrendingResponse>("/api/v1/stories/trending?limit=5")
      .then((data) => setTrending(data.stories))
      .catch(() => setTrending([]));
    apiGet<TrendingTagsResponse>("/api/v1/tags/trending?limit=10")
      .then((data) => setTags(data.tags.map((t) => t.tag)))
      .catch(() => setTags([]));
  }, []);

  return (
    <aside className="sidebar">
      <div className="ad ad-sidebar">300 × 600 · Medium Rectangle</div>
      <div className="panel">
        <h4>Trending this week</h4>
        <div className="trending">
          {trending.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-mute)",
                fontFamily: "var(--mono)",
              }}
            >
              loading…
            </div>
          )}
          {trending.map((s, i) => (
            <Link
              href={`/s/${s.slug}`}
              className="item"
              key={s.id}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span className="rank">0{i + 1}</span>
              <div>
                <h5>{s.title}</h5>
                <span className="by">
                  {s.author.name} ·{" "}
                  {s.views > 999 ? (s.views / 1000).toFixed(1) + "k" : s.views}{" "}
                  reads
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="panel">
        <h4>Popular tags</h4>
        <div className="tag-cloud">
          {tags.length === 0 && (
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-mute)",
                fontFamily: "var(--mono)",
              }}
            >
              loading…
            </span>
          )}
          {tags.map((t) => (
            <button key={t} onClick={() => onTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      </div>
      <div
        className="panel"
        style={{
          background: "var(--accent-soft)",
          borderColor: "var(--accent)",
        }}
      >
        <h4 style={{ color: "var(--accent)" }}>Writing this week?</h4>
        <p
          style={{
            fontSize: 13,
            margin: "0 0 12px",
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          Every Sunday we publish a reader-voted short from the library. Submit
          your draft by Friday.
        </p>
        <Link
          href="/compose"
          className="btn"
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
          }}
        >
          Submit a story
        </Link>
      </div>
    </aside>
  );
}

function EmptyState({
  search,
  hasFilters,
  onClear,
}: {
  search: string;
  hasFilters: boolean;
  onClear: () => void;
}) {
  const headline = search
    ? hasFilters
      ? `No matches for "${search}" within these filters.`
      : `No stories match "${search}" yet.`
    : "No stories match those filters yet.";

  return (
    <div
      style={{
        gridColumn: "1/-1",
        padding: "60px 20px",
        textAlign: "center",
        color: "var(--ink-mute)",
        fontFamily: "var(--serif)",
        fontStyle: "italic",
        fontSize: 18,
      }}
    >
      {headline}
      {hasFilters && (
        <>
          {" "}
          <button
            type="button"
            onClick={onClear}
            style={{
              color: "var(--accent)",
              textDecoration: "underline",
              fontStyle: "normal",
              fontFamily: "var(--mono)",
              fontSize: 13,
              marginLeft: 4,
            }}
          >
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Browse() {
  const searchParams = useSearchParams();
  const search = useDebouncedValue(searchParams.get("q") ?? "", 250);

  const [genre, setGenre] = useState("all");
  const [length, setLength] = useState("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [stories, setStories] = useState<StoryWire[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<StoryWire | null>(null);
  const requestId = useRef(0);

  // When the user kicks off a fresh search (empty → non-empty q), drop
  // any narrowing filters they had set while browsing. Otherwise a
  // genre/length/tag chip that happens to exclude the queried story
  // silently hides matches — which reads as "search is broken" to the
  // user even though the API works correctly.
  const prevSearch = useRef(search);
  useEffect(() => {
    if (prevSearch.current === "" && search !== "") {
      setGenre("all");
      setLength("all");
      setActiveTag(null);
    }
    prevSearch.current = search;
  }, [search]);

  // Featured runs once on mount.
  useEffect(() => {
    apiGet<FeaturedResponse>("/api/v1/stories/featured")
      .then((data) => setFeatured(data.story))
      .catch(() => setFeatured(null));
  }, []);

  const fetchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (genre !== "all") params.set("genre", genre);
    if (length !== "all") params.set("length", length);
    if (sort !== "recent") params.set("sort", sort);
    if (activeTag) params.set("tag", activeTag);
    if (search) params.set("q", search);
    params.set("limit", "30");
    const qs = params.toString();
    return `/api/v1/stories${qs ? `?${qs}` : ""}`;
  }, [genre, length, sort, activeTag, search]);

  // List refetches whenever the URL changes; out-of-order responses are
  // discarded via the requestId ref so a fast typer never sees an old
  // result paint over the new one.
  useEffect(() => {
    const my = ++requestId.current;
    setLoading(true);
    apiGet<StoriesResponse>(fetchUrl)
      .then((data) => {
        if (my === requestId.current) setStories(data.stories);
      })
      .catch(() => {
        if (my === requestId.current) setStories([]);
      })
      .finally(() => {
        if (my === requestId.current) setLoading(false);
      });
  }, [fetchUrl]);

  const onTag = useCallback((tag: string) => setActiveTag(tag), []);

  type Item = { kind: "card"; data: StoryWire } | { kind: "ad"; id: string };
  const withAds = useMemo<Item[]>(() => {
    if (!stories) return [];
    const items: Item[] = [];
    stories.forEach((s, i) => {
      items.push({ kind: "card", data: s });
      if ((i + 1) % 4 === 0 && i < stories.length - 1) {
        items.push({ kind: "ad", id: "inline-" + i });
      }
    });
    return items;
  }, [stories]);

  return (
    <>
      {featured ? <Hero story={featured} /> : <HeroSkeleton />}
      <div className="ad ad-leaderboard">728 × 90 · Leaderboard</div>
      <Filters
        genre={genre}
        setGenre={setGenre}
        length={length}
        setLength={setLength}
        sort={sort}
        setSort={setSort}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        count={stories?.length ?? null}
        loading={loading}
        searchTerm={search}
      />
      <div className="grid-wrap" data-screen-label="02 Library">
        <div
          className="story-grid"
          style={{
            opacity: loading && stories !== null ? 0.55 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          {stories === null && (
            <div
              style={{
                gridColumn: "1/-1",
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--ink-mute)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.1em",
              }}
            >
              loading library…
            </div>
          )}
          {withAds.map((item) =>
            item.kind === "card" ? (
              <StoryCard
                key={item.data.id}
                story={item.data}
                onTag={onTag}
              />
            ) : (
              <div
                key={item.id}
                className="ad ad-inline"
                style={{ gridColumn: "1 / -1" }}
              >
                728 × 90 · In-Feed Ad Slot
              </div>
            ),
          )}
          {stories !== null && stories.length === 0 && (
            <EmptyState
              search={search}
              hasFilters={
                genre !== "all" || length !== "all" || activeTag !== null
              }
              onClear={() => {
                setGenre("all");
                setLength("all");
                setActiveTag(null);
              }}
            />
          )}
        </div>
        <Sidebar onTag={onTag} />
      </div>
    </>
  );
}
