import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./session";
import { hasPerm, isStaffRole, type Permission } from "./permissions";

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await signSession({ userId: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the logged-in, non-suspended user (fresh from DB) or null. De-duplicated per request. */
export const getCurrentUser = cache(async function getCurrentUser() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      active: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      country: true,
      createdAt: true,
    },
  });
  if (!user || !user.active) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Any team member (super admin or staff). */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) redirect("/login?next=/admin");
  return user;
}

/** Team member with a specific permission. Super admins always pass. */
export async function requirePerm(perm: Permission) {
  const user = await requireStaff();
  if (!hasPerm(user, perm)) redirect(`/admin?denied=${perm}`);
  return user;
}

/** Super admin only. */
export async function requireAdmin() {
  const user = await requireStaff();
  if (user.role !== "ADMIN") redirect("/admin?denied=admin");
  return user;
}
