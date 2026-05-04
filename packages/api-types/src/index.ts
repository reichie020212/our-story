/**
 * @our-story/api-types — shared wire-format contract for /api/v1/*.
 *
 * Source of truth lives in the Zod schemas; TS types are inferred via
 * z.infer. Mobile validates incoming responses with these schemas;
 * apps/web's serializer functions (apps/web/lib/story.ts etc.) emit
 * data that satisfies them. If the schema and the serializer disagree,
 * the contract is broken — the schema wins.
 *
 * Keep this package framework-free: no Next.js, no Prisma, no Expo
 * imports. Only Zod, plain TypeScript.
 */
import { z } from "zod";

// ---------- Domain enums (must match prisma/schema.prisma) ----------

export const GenreSchema = z.enum([
  "literary",
  "fantasy",
  "scifi",
  "romance",
  "horror",
  "mystery",
  "memoir",
  "poetry",
]);
export type Genre = z.infer<typeof GenreSchema>;

export const StoryLengthSchema = z.enum([
  "flash",
  "short",
  "novelette",
  "novella",
]);
export type StoryLength = z.infer<typeof StoryLengthSchema>;

export const StoryStatusSchema = z.enum([
  "draft",
  "published",
  "unlisted",
  "private",
]);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

// ---------- Error envelope ----------

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ---------- User ----------

/** The shape of `users` rows that gets shipped to clients. Email is
 *  included on auth responses (signin / me) but never on author slices
 *  embedded in stories. */
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  handle: z.string(),
  initial: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

/** Author slice embedded in StoryWire — no email, just the byline. */
export const StoryAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  initial: z.string(),
});
export type StoryAuthor = z.infer<typeof StoryAuthorSchema>;

// ---------- Story (wire format) ----------

/** What `/api/v1/stories` and friends return. `liked` / `bookmarked`
 *  are present only on single-story GET when the caller is signed in;
 *  they're absent (undefined, not null) otherwise. */
export const StoryWireSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  synopsis: z.string(),
  body: z.array(z.string()),
  genre: GenreSchema,
  length: StoryLengthSchema,
  tags: z.array(z.string()),
  status: StoryStatusSchema,
  featured: z.boolean(),
  publishedAt: z.string().nullable(),
  minutes: z.number().int(),
  views: z.number().int(),
  likes: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: StoryAuthorSchema,
  liked: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
});
export type StoryWire = z.infer<typeof StoryWireSchema>;

// ---------- Auth responses ----------

/** GET /auth/me, POST /auth/signin, POST /auth/signup, POST /auth/signout
 *  (the last is just `{ ok: true }`, schema below). */
export const UserResponseSchema = z.object({ user: PublicUserSchema });
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const OkResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponseSchema>;

/** POST /auth/mobile/login and /auth/mobile/refresh. Access is a short-
 *  lived RS256 JWT; refresh is opaque (sha256-hashed at rest server-
 *  side, rotated on every /refresh). Both expiresAt fields are ISO
 *  strings so they cross JSON cleanly. */
export const MobileAuthResponseSchema = z.object({
  user: PublicUserSchema,
  accessToken: z.string(),
  accessTokenExpiresAt: z.string(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
});
export type MobileAuthResponse = z.infer<typeof MobileAuthResponseSchema>;

// ---------- Story list / single ----------

/** Cursor is opaque — a story id when no `q`, an offset string when `q`
 *  is set. Callers should round-trip it without parsing. */
export const StoryListResponseSchema = z.object({
  stories: z.array(StoryWireSchema),
  nextCursor: z.string().nullable(),
});
export type StoryListResponse = z.infer<typeof StoryListResponseSchema>;

export const StoryResponseSchema = z.object({ story: StoryWireSchema });
export type StoryResponse = z.infer<typeof StoryResponseSchema>;

/** Trending and featured endpoints return a list with no pagination
 *  (top-N rolling) so they share a simpler shape than the cursored list. */
export const StoryListNoCursorResponseSchema = z.object({
  stories: z.array(StoryWireSchema),
});
export type StoryListNoCursorResponse = z.infer<
  typeof StoryListNoCursorResponseSchema
>;

// ---------- Engagement ----------

export const LikeResponseSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int(),
});
export type LikeResponse = z.infer<typeof LikeResponseSchema>;

export const BookmarkResponseSchema = z.object({
  bookmarked: z.boolean(),
});
export type BookmarkResponse = z.infer<typeof BookmarkResponseSchema>;

// ---------- Tags ----------

export const TrendingTagsResponseSchema = z.object({
  tags: z.array(z.object({ tag: z.string(), count: z.number().int() })),
});
export type TrendingTagsResponse = z.infer<typeof TrendingTagsResponseSchema>;
