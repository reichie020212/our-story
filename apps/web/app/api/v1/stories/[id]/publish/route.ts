import { db } from "@/lib/db";
import { error, json } from "@/lib/api";
import {
  ForbiddenError,
  NotFoundError,
  handleError,
  requireUser,
} from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { isApprovalRequired } from "@/lib/settings";
import { paragraphsFromBody, serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const writeLimiter = () => getLimiter("write", 10, "1 m");

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(writeLimiter(), `u:${user.id}`);
    if (blocked) return blocked;
    const { id } = await params;

    const story = await db.story.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { author: true },
    });
    if (!story || story.deletedAt) throw new NotFoundError("Story not found.");
    if (story.authorId !== user.id) throw new ForbiddenError();

    // Publish requires a title, synopsis, and at least one paragraph.
    if (!story.title.trim()) {
      return error(
        422,
        "missing_title",
        "Add a title before publishing.",
      );
    }
    if (!story.synopsis.trim()) {
      return error(
        422,
        "missing_synopsis",
        "Write a one-line synopsis before publishing — it's what readers see on the card.",
      );
    }
    const paragraphs = paragraphsFromBody(story.body);
    if (paragraphs.length === 0 || paragraphs.every((p) => !p.trim())) {
      return error(
        422,
        "missing_body",
        "Stories need at least one paragraph before they can be published.",
      );
    }

    // The approval gate covers only the draft → published transition.
    // It's bypassed when the gate is off, when the author is an admin, or
    // when the story is already published (editing a live story keeps it
    // live — re-publishing doesn't drop it back into review).
    const approvalRequired = await isApprovalRequired();
    const bypassesReview =
      !approvalRequired ||
      user.role === "admin" ||
      story.status === "published";

    const updated = bypassesReview
      ? await db.story.update({
          where: { id: story.id },
          data: {
            status: "published",
            publishedAt: story.publishedAt ?? new Date(),
            rejectionReason: null,
          },
          include: { author: true },
        })
      : await db.story.update({
          where: { id: story.id },
          // Non-admin author submitting under the gate: hand the story to
          // the review queue. Reset any prior review verdict so an edited,
          // resubmitted (previously rejected) story starts clean.
          data: {
            status: "pending_review",
            submittedForReviewAt: new Date(),
            reviewedAt: null,
            reviewedById: null,
            rejectionReason: null,
          },
          include: { author: true },
        });

    return json({ story: serializeStory(updated, updated.author) });
  } catch (err) {
    return handleError(err);
  }
}
