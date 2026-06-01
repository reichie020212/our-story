import { db } from "./db";

// The global AppSetting row uses a fixed primary key so there's only ever
// one. All reads/writes go through this id.
const SETTINGS_ID = "global";

/** Read the global settings, materializing the singleton row on first use.
 *  Defaults to approvalRequired = false (direct publish — the v1 behavior). */
export async function getAppSettings(): Promise<{ approvalRequired: boolean }> {
  const row = await db.appSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
    select: { approvalRequired: true },
  });
  return { approvalRequired: row.approvalRequired };
}

/** Convenience: just the publish-gate flag. */
export async function isApprovalRequired(): Promise<boolean> {
  return (await getAppSettings()).approvalRequired;
}

/** Set the approval gate. `updatedById` records which admin flipped it. */
export async function setApprovalRequired(
  approvalRequired: boolean,
  updatedById: string,
): Promise<{ approvalRequired: boolean }> {
  const row = await db.appSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, approvalRequired, updatedById },
    update: { approvalRequired, updatedById },
    select: { approvalRequired: true },
  });
  return { approvalRequired: row.approvalRequired };
}
