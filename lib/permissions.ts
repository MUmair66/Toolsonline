// Shared (client + server) role/permission definitions.

export const PERMISSIONS = [
  { key: "orders", label: "Orders", desc: "View and process orders" },
  { key: "products", label: "Products & inventory", desc: "Create, edit, import and bulk-edit products" },
  { key: "categories", label: "Categories", desc: "Manage product categories" },
  { key: "customers", label: "Customers", desc: "View, edit and suspend customers" },
  { key: "coupons", label: "Coupons", desc: "Create discount codes" },
  { key: "reviews", label: "Reviews", desc: "Moderate product reviews" },
  { key: "messages", label: "Messages & subscribers", desc: "Contact inbox and newsletter list" },
  { key: "settings", label: "Settings & automations", desc: "Store settings and automation rules" },
  { key: "team", label: "Team & access", desc: "Add/remove admins and staff, change permissions" },
  { key: "activity", label: "Activity log", desc: "See what every team member did" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const ROLES = {
  ADMIN: "Super admin",
  STAFF: "Staff",
  CUSTOMER: "Customer",
} as const;

export function parsePermissions(raw: string | null | undefined): Permission[] {
  try {
    const arr = JSON.parse(raw || "[]");
    const valid = PERMISSIONS.map((p) => p.key) as string[];
    return Array.isArray(arr) ? (arr.filter((x) => valid.includes(x)) as Permission[]) : [];
  } catch {
    return [];
  }
}

export function isStaffRole(role: string) {
  return role === "ADMIN" || role === "STAFF";
}

export function hasPerm(user: { role: string; permissions: string } | null | undefined, perm: Permission) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return parsePermissions(user.permissions).includes(perm);
}
