import "server-only";
import { db } from "./db";

export async function logActivity(
  user: { id: string; name: string } | null,
  action: string,
  entity: string,
  details?: string,
  entityId?: string
) {
  try {
    await db.activityLog.create({
      data: { userId: user?.id ?? null, userName: user?.name ?? "System", action, entity, details, entityId },
    });
  } catch {
    // logging must never break the action itself
  }
}
