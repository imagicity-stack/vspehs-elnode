// ─────────────────────────────────────────────────────────────
// Notification routing
// ─────────────────────────────────────────────────────────────
// Decides which stored notifications a given signed-in user should see. The
// audience is coarse (teachers / parents / admins) and the optional staff and
// class lists narrow it to the specific people a message is actually about.
// ─────────────────────────────────────────────────────────────

import { AppNotification, AppUser, Role } from "./types";

const AUDIENCE_FOR: Record<Role, AppNotification["audience"][]> = {
  teacher: ["teachers", "all"],
  parent: ["parents", "all"],
  accountant: ["admins", "all"],
  superadmin: ["admins", "teachers", "all"],
};

/**
 * Notifications addressed to this user, newest first.
 * `classIds` is matched against the classes of the children linked to a parent.
 */
export function notificationsFor(
  user: AppUser | null,
  all: AppNotification[],
  ctx: { classIds?: string[] } = {},
): AppNotification[] {
  if (!user) return [];
  const audiences = AUDIENCE_FOR[user.role] ?? ["all"];
  const myClasses = ctx.classIds ?? [];

  return all
    .filter((n) => audiences.includes(n.audience))
    .filter((n) => {
      // A staff-scoped notice only reaches the staff it names.
      if (n.staffIds?.length) {
        if (user.role === "superadmin") return true;
        return !!user.staffId && n.staffIds.includes(user.staffId);
      }
      return true;
    })
    .filter((n) => {
      // A class-scoped notice only reaches parents of that class.
      if (n.classIds?.length && user.role === "parent") {
        return n.classIds.some((c) => myClasses.includes(c));
      }
      return true;
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

export const unreadCount = (list: AppNotification[], userId: string) =>
  list.filter((n) => !n.readBy?.includes(userId)).length;
