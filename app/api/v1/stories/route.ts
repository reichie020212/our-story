import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { uniqueStorySlug } from "@/lib/slug";
import { minutesFromBody, serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const GENRES = [
  "literary",
  "fantasy",
  "scifi",
  "romance",
  "horror",
  "mystery",
  "memoir",
  "poetry",
] as const;
const LENGTHS = ["flash", "short", "novelette", "novella"] as const;

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(500).optional().default(""),
  body: z
    .array(z.string().max(2000))
    .max(30, "A draft can have at most 30 paragraphs.")
    .optional()
    .default([]),
  genre: z.enum(GENRES).optional().default("literary"),
  length: z.enum(LENGTHS).optional().default("flash"),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    const slug = await uniqueStorySlug(data.title);
    const cleanedTags = Array.from(
      new Set(data.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"))),
    );

    const story = await db.story.create({
      data: {
        slug,
        authorId: user.id,
        title: data.title,
        synopsis: data.synopsis,
        body: data.body,
        genre: data.genre,
        length: data.length,
        tags: cleanedTags,
        status: "draft",
        featured: false,
        minutes: minutesFromBody(data.body),
      },
    });

    return json(
      {
        story: serializeStory(story, {
          id: user.id,
          name: user.name,
          handle: user.handle,
          initial: user.initial,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
