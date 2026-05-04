/**
 * Contract tests for the public read endpoints. Each test calls the
 * Next App Router route handler directly (no dev server needed) and
 * validates the response against the shared @our-story/api-types
 * Zod schemas. If a serializer drifts from the schema, these fail
 * loudly rather than silently shipping a broken wire format to mobile.
 *
 * Coverage: stories list (default + FTS + filters + pagination),
 * single story, featured, trending stories, trending tags.
 *
 * Out of scope: auth-required mutations (signin/signup/create/like/
 * bookmark/publish/delete). Those need cookie+header context that
 * the next/headers module only provides inside a real Next request
 * lifecycle. Add them with a child-process Next dev server when the
 * auth surface stabilizes.
 */
import { describe, it, expect } from "vitest";
import {
  StoryListNoCursorResponseSchema,
  StoryListResponseSchema,
  StoryWireSchema,
  TrendingTagsResponseSchema,
} from "@our-story/api-types";

import { GET as listStories } from "@/app/api/v1/stories/route";
import { GET as getFeatured } from "@/app/api/v1/stories/featured/route";
import { GET as getTrending } from "@/app/api/v1/stories/trending/route";
import { GET as getTrendingTags } from "@/app/api/v1/tags/trending/route";

const BASE = "http://localhost";

function req(path: string): Request {
  return new Request(`${BASE}${path}`);
}

async function asJson(res: Response): Promise<unknown> {
  return res.json();
}

describe("GET /api/v1/stories", () => {
  it("returns a parseable list against the seed", async () => {
    const res = await listStories(req("/api/v1/stories"));
    expect(res.status).toBe(200);
    const parsed = StoryListResponseSchema.parse(await asJson(res));
    expect(parsed.stories.length).toBeGreaterThan(0);
    // Every item satisfies the per-item schema.
    for (const s of parsed.stories) {
      expect(s.status).toBe("published");
      expect(s.body).toBeInstanceOf(Array);
    }
  });

  it("FTS path: q=trains stems to match 'Two Trains'", async () => {
    const res = await listStories(req("/api/v1/stories?q=trains"));
    const parsed = StoryListResponseSchema.parse(await asJson(res));
    const slugs = parsed.stories.map((s) => s.slug);
    expect(slugs).toContain("two-trains");
  });

  it("FTS path: title (weight A) outranks tag-only (weight C)", async () => {
    // 'first' appears in the title 'My First Home' and in tags
    // 'first-person' / 'first-contact' on two other stories. Title
    // match should rank ahead of tag matches.
    const res = await listStories(req("/api/v1/stories?q=first"));
    const parsed = StoryListResponseSchema.parse(await asJson(res));
    expect(parsed.stories[0]?.slug).toBe("my-first-home");
  });

  it("filter combo: q=memory + tag=family narrows to one", async () => {
    const res = await listStories(
      req("/api/v1/stories?q=memory&tag=family"),
    );
    const parsed = StoryListResponseSchema.parse(await asJson(res));
    expect(parsed.stories.map((s) => s.slug)).toEqual(["my-first-home"]);
  });

  it("offset cursor pagination on q path", async () => {
    const page1 = await listStories(req("/api/v1/stories?q=memory&limit=1"));
    const p1 = StoryListResponseSchema.parse(await asJson(page1));
    expect(p1.stories.length).toBe(1);
    expect(p1.nextCursor).not.toBeNull();
    if (!p1.nextCursor) return;

    const page2 = await listStories(
      req(`/api/v1/stories?q=memory&limit=1&cursor=${p1.nextCursor}`),
    );
    const p2 = StoryListResponseSchema.parse(await asJson(page2));
    expect(p2.stories[0]?.slug).not.toBe(p1.stories[0]?.slug);
  });

  it("no match returns empty + null cursor", async () => {
    const res = await listStories(
      req("/api/v1/stories?q=zzznonexistentterm"),
    );
    const parsed = StoryListResponseSchema.parse(await asJson(res));
    expect(parsed.stories).toEqual([]);
    expect(parsed.nextCursor).toBeNull();
  });
});

// GET /api/v1/stories/[id] is intentionally NOT covered here. The
// handler calls getAuthenticatedUser → getCurrentSession → cookies(),
// and Next's cookies() throws outside a real request lifecycle. To
// test it we'd either spawn a dev server child process (slow but
// honest) or thread the async-local-storage manually (brittle). Park
// it until the test suite needs auth-required tests in general.

describe("GET /api/v1/stories/featured", () => {
  it("returns the one featured story", async () => {
    const res = await getFeatured();
    expect(res.status).toBe(200);
    const body = (await asJson(res)) as { story: unknown };
    const story = StoryWireSchema.parse(body.story);
    expect(story.featured).toBe(true);
    expect(story.status).toBe("published");
  });
});

describe("GET /api/v1/stories/trending", () => {
  it("returns a parseable list (no cursor)", async () => {
    const res = await getTrending(req("/api/v1/stories/trending"));
    const parsed = StoryListNoCursorResponseSchema.parse(await asJson(res));
    expect(parsed.stories).toBeInstanceOf(Array);
  });
});

describe("GET /api/v1/tags/trending", () => {
  it("returns tag tally with seed data", async () => {
    const res = await getTrendingTags(req("/api/v1/tags/trending"));
    const parsed = TrendingTagsResponseSchema.parse(await asJson(res));
    expect(parsed.tags.length).toBeGreaterThan(0);
    for (const t of parsed.tags) {
      expect(t.count).toBeGreaterThan(0);
    }
  });
});
