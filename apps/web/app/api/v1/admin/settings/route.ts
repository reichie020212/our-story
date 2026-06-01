import { z } from "zod";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireAdmin } from "@/lib/auth-guard";
import { getAppSettings, setApprovalRequired } from "@/lib/settings";

export const runtime = "nodejs";

const PatchBody = z
  .object({ approvalRequired: z.boolean() })
  .strict();

/** Admin reads the global settings. */
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getAppSettings();
    return json({ settings });
  } catch (err) {
    return handleError(err);
  }
}

/** Admin toggles the publish-approval gate. */
export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);

    const settings = await setApprovalRequired(
      parsed.data.approvalRequired,
      admin.id,
    );
    return json({ settings });
  } catch (err) {
    return handleError(err);
  }
}
