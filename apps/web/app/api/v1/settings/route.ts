import { json } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/settings";

export const runtime = "nodejs";

/** Public read of non-sensitive global settings. The composer uses
 *  `approvalRequired` to decide whether the button reads "Publish" or
 *  "Send for approval". No auth required — it exposes only the flag. */
export async function GET() {
  try {
    const settings = await getAppSettings();
    return json({ settings });
  } catch (err) {
    return handleError(err);
  }
}
