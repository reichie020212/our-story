import { z } from "zod";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import {
  ForbiddenError,
  NotFoundError,
  handleError,
  requireUser,
} from "@/lib/auth-guard";
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

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    synopsis: z.string().trim().max(500).optional(),
    body: z.array(z.string().max(2000)).max(30).optional(),
    genre: z.enum(GENRES).optional(),
    length: z.enum(LENGTHS).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  })
  .strict();

async function loadOwnedStory(id: string, userId: string) {
  const story = await db.story.findUnique({
    where: { id },
    include: { author: true },
  });
  if (!story || story.deletedAt) throw new NotFoundError("Story not found.");
  if (story.authorId !== userId) throw new ForbiddenError();
  return story;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const story = await loadOwnedStory(id, user.id);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    const update: Parameters<typeof db.story.update>[0]["data"] = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.synopsis !== undefined) update.synopsis = data.synopsis;
    if (data.body !== undefined) {
      update.body = data.body;
      update.minutes = minutesFromBody(data.body);
    }
    if (data.genre !== undefined) update.genre = data.genre;
    if (data.length !== undefined) update.length = data.length;
    if (data.tags !== undefined) {
      update.tags = Array.from(
        new Set(data.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"))),
      );
    }

    if (Object.keys(update).length === 0) {
      return json({ story: serializeStory(story, story.author) });
    }

    const updated = await db.story.update({
      where: { id: story.id },
      data: update,
      include: { author: true },
    });

    return json({ story: serializeStory(updated, updated.author) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const story = await loadOwnedStory(id, user.id);
    await db.story.update({
      where: { id: story.id },
      data: { deletedAt: new Date() },
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
