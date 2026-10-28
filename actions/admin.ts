"use server";

import bcrypt from "bcryptjs";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG, SETTINGS_TAG } from "@/lib/settings";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requirePerm, requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { storeImage } from "@/lib/storage";
import { ORDER_STATUSES, PAYMENT_STATUSES, slugify } from "@/lib/utils";
import { hasPerm, PERMISSIONS, parsePermissions } from "@/lib/permissions";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v === "" ? null : Number(v);
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function refreshAll() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

async function uniqueSlug(model: "product" | "category" | "brand", base: string, excludeId?: string) {
  let slug = base || "item";
  let i = 1;
  while (true) {
    const found =
      model === "product"
        ? await db.product.findUnique({ where: { slug } })
        : model === "brand"
          ? await db.brand.findUnique({ where: { slug } })
          : await db.category.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${++i}`;
  }
}

/** Ensures at least one active super admin remains after an operation. */
async function wouldRemoveLastAdmin(userIds: string[]) {
  const remaining = await db.user.count({ where: { role: "ADMIN", active: true, id: { notIn: userIds } } });
  return remaining === 0;
}

/* ================= Image upload ================= */

export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireStaff();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected" };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" };
  if (file.size > 10 * 1024 * 1024) return { error: "Image must be under 10MB" };
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) return { error: "Supported formats: JPG, PNG, GIF, WEBP, AVIF" };

  try {
    const { url } = await storeImage(Buffer.from(await file.arrayBuffer()));
    return { url };
  } catch (e) {
    console.error("Image upload failed:", e);
    return { error: "Could not process this image. Try a different file." };
  }
}

/* ================= Products ================= */

export async function saveProduct(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("products");
  const name = str(fd, "name");
  const price = num(fd, "price");
  const stock = num(fd, "stock") ?? 0;
  if (!name) return { error: "Product name is required." };
  if (price == null || isNaN(price) || price < 0) return { error: "Please enter a valid price." };
  if (isNaN(stock) || stock < 0) return { error: "Please enter a valid stock quantity." };

  const comparePrice = num(fd, "comparePrice");
  let images: string[] = [];
  try {
    images = JSON.parse(str(fd, "images") || "[]");
  } catch {}

  const data = {
    name,
    slug: await uniqueSlug("product", slugify(str(fd, "slug") || name), id ?? undefined),
    description: str(fd, "description"),
    price,
    comparePrice: comparePrice && comparePrice > price ? comparePrice : null,
    stock: Math.floor(stock),
    sku: str(fd, "sku") || null,
    categoryId: str(fd, "categoryId") || null,
    brandId: str(fd, "brandId") || null,
    images: JSON.stringify(images),
    featured: fd.get("featured") === "on",
    active: fd.get("active") === "on",
  };

  if (id) {
    await db.product.update({ where: { id }, data });
    await logActivity(me, "updated", "product", `Updated product "${name}"`, id);
  } else {
    const p = await db.product.create({ data });
    await logActivity(me, "created", "product", `Created product "${name}"`, p.id);
  }
  refreshAll();
  redirect("/admin/products?saved=1");
}

export async function deleteProduct(id: string) {
  const me = await requirePerm("products");
  const p = await db.product.delete({ where: { id } });
  await logActivity(me, "deleted", "product", `Deleted product "${p.name}"`);
  refreshAll();
}

export async function toggleProductActive(id: string) {
  const me = await requirePerm("products");
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return;
  await db.product.update({ where: { id }, data: { active: !p.active } });
  await logActivity(me, "updated", "product", `${p.active ? "Hid" : "Published"} "${p.name}"`, id);
  refreshAll();
}

export async function duplicateProduct(id: string) {
  const me = await requirePerm("products");
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return;
  const copy = await db.product.create({
    data: {
      name: `${p.name} (Copy)`,
      slug: await uniqueSlug("product", `${p.slug}-copy`),
      description: p.description,
      price: p.price,
      comparePrice: p.comparePrice,
      stock: p.stock,
      sku: p.sku ? `${p.sku}-COPY` : null,
      images: p.images,
      featured: false,
      active: false,
      categoryId: p.categoryId,
    },
  });
  await logActivity(me, "created", "product", `Duplicated "${p.name}"`, copy.id);
  refreshAll();
  redirect(`/admin/products/${copy.id}`);
}

/** Inline stock editing from the products table. */
export async function updateStock(id: string, stock: number) {
  const me = await requirePerm("products");
  const value = Math.max(0, Math.floor(Number(stock) || 0));
  const p = await db.product.update({ where: { id }, data: { stock: value } });
  await logActivity(me, "updated", "product", `Set stock of "${p.name}" to ${value}`, id);
  refreshAll();
  return { ok: true, stock: value };
}

export async function bulkProducts(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("products");
  const ids = fd.getAll("ids").map(String);
  const op = str(fd, "op");
  const value = str(fd, "value");
  if (!ids.length) return { error: "Select at least one product." };
  const where = { id: { in: ids } };
  const n = plural(ids.length, "product");
  let msg = "";

  switch (op) {
    case "activate":
      await db.product.updateMany({ where, data: { active: true } });
      msg = `Published ${n}`;
      break;
    case "deactivate":
      await db.product.updateMany({ where, data: { active: false } });
      msg = `Hid ${n}`;
      break;
    case "feature":
      await db.product.updateMany({ where, data: { featured: true } });
      msg = `Featured ${n}`;
      break;
    case "unfeature":
      await db.product.updateMany({ where, data: { featured: false } });
      msg = `Un-featured ${n}`;
      break;
    case "delete":
      await db.product.deleteMany({ where });
      msg = `Deleted ${n}`;
      break;
    case "category":
      await db.product.updateMany({ where, data: { categoryId: value || null } });
      msg = `Moved ${n} to a new category`;
      break;
    case "brand":
      await db.product.updateMany({ where, data: { brandId: value || null } });
      msg = `Changed the brand of ${n}`;
      break;
    case "set_stock":
    case "add_stock": {
      const v = Math.floor(Number(value));
      if (isNaN(v)) return { error: "Enter a stock number." };
      if (op === "set_stock") await db.product.updateMany({ where, data: { stock: Math.max(0, v) } });
      else {
        await db.product.updateMany({ where, data: { stock: { increment: v } } });
        await db.product.updateMany({ where: { ...where, stock: { lt: 0 } }, data: { stock: 0 } });
      }
      msg = op === "set_stock" ? `Set stock to ${v} for ${n}` : `Adjusted stock by ${v > 0 ? "+" : ""}${v} for ${n}`;
      break;
    }
    case "price_pct": {
      const pct = Number(value);
      if (isNaN(pct) || pct <= -100) return { error: "Enter a valid percentage (e.g. 10 or -15)." };
      const items = await db.product.findMany({ where });
      await db.$transaction(
        items.map((p) =>
          db.product.update({
            where: { id: p.id },
            data: {
              price: round2(p.price * (1 + pct / 100)),
              comparePrice: p.comparePrice ? round2(p.comparePrice * (1 + pct / 100)) : null,
            },
          })
        )
      );
      msg = `Changed prices by ${pct > 0 ? "+" : ""}${pct}% for ${n}`;
      break;
    }
    case "sale": {
      const pct = Number(value);
      if (!(pct > 0 && pct < 100)) return { error: "Enter a discount between 1 and 99%." };
      const items = await db.product.findMany({ where });
      await db.$transaction(
        items.map((p) => {
          const original = p.comparePrice ?? p.price;
          return db.product.update({ where: { id: p.id }, data: { comparePrice: original, price: round2(original * (1 - pct / 100)) } });
        })
      );
      msg = `Started a ${pct}% flash sale on ${n}`;
      break;
    }
    case "end_sale": {
      const items = await db.product.findMany({ where: { ...where, comparePrice: { not: null } } });
      await db.$transaction(
        items.map((p) => db.product.update({ where: { id: p.id }, data: { price: p.comparePrice!, comparePrice: null } }))
      );
      msg = `Ended the sale on ${plural(items.length, "product")}`;
      break;
    }
    default:
      return { error: "Choose a bulk action." };
  }
  await logActivity(me, "bulk", "product", msg);
  refreshAll();
  return { success: msg };
}

export type ImportRow = {
  name: string;
  description?: string;
  price: string;
  compareprice?: string;
  stock?: string;
  sku?: string;
  category?: string;
  brand?: string;
  images?: string;
  featured?: string;
  active?: string;
};

export async function importProducts(rows: ImportRow[], mode: "upsert" | "create") {
  const me = await requirePerm("products");
  const truthy = (v?: string) => ["true", "1", "yes", "y"].includes((v || "").toLowerCase());
  let created = 0;
  let updated = 0;
  const errors: string[] = [];
  const catCache = new Map<string, string>();
  const brandCache = new Map<string, string>();
  for (const b of await db.brand.findMany()) brandCache.set(b.name.toLowerCase(), b.id);

  for (const c of await db.category.findMany()) catCache.set(c.name.toLowerCase(), c.id);

  for (let i = 0; i < Math.min(rows.length, 2000); i++) {
    const r = rows[i];
    const line = i + 2;
    const name = (r.name || "").trim();
    const price = Number(r.price);
    if (!name) {
      errors.push(`Row ${line}: missing name`);
      continue;
    }
    if (isNaN(price) || price < 0) {
      errors.push(`Row ${line}: invalid price "${r.price}"`);
      continue;
    }

    let categoryId: string | null = null;
    const catName = (r.category || "").trim();
    if (catName) {
      categoryId = catCache.get(catName.toLowerCase()) ?? null;
      if (!categoryId) {
        const c = await db.category.create({ data: { name: catName, slug: await uniqueSlug("category", slugify(catName)) } });
        catCache.set(catName.toLowerCase(), c.id);
        categoryId = c.id;
      }
    }
    let brandId: string | null = null;
    const brandName = (r.brand || "").trim();
    if (brandName) {
      brandId = brandCache.get(brandName.toLowerCase()) ?? null;
      if (!brandId) {
        const b = await db.brand.create({ data: { name: brandName, slug: await uniqueSlug("brand", slugify(brandName)) } });
        brandCache.set(brandName.toLowerCase(), b.id);
        brandId = b.id;
      }
    }
    const compare = Number(r.compareprice);
    const data = {
      name,
      description: r.description || "",
      price,
      comparePrice: compare > price ? compare : null,
      stock: Math.max(0, Math.floor(Number(r.stock) || 0)),
      sku: r.sku?.trim() || null,
      categoryId,
      brandId,
      images: JSON.stringify((r.images || "").split(/[|;]/).map((s) => s.trim()).filter(Boolean)),
      featured: truthy(r.featured),
      active: r.active === undefined || r.active === "" ? true : truthy(r.active),
    };

    const existing =
      mode === "upsert"
        ? data.sku
          ? await db.product.findFirst({ where: { sku: data.sku } })
          : await db.product.findUnique({ where: { slug: slugify(name) } })
        : null;
    try {
      if (existing) {
        await db.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.product.create({ data: { ...data, slug: await uniqueSlug("product", slugify(name)) } });
        created++;
      }
    } catch (e) {
      errors.push(`Row ${line}: ${e instanceof Error ? e.message.split("\n")[0] : "failed"}`);
    }
  }

  await logActivity(me, "import", "product", `Imported products: ${created} created, ${updated} updated, ${errors.length} errors`);
  refreshAll();
  return { created, updated, errors };
}

/* ================= Categories ================= */

export async function saveCategory(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("categories");
  const name = str(fd, "name");
  if (!name) return { error: "Category name is required." };
  const data = {
    name,
    slug: await uniqueSlug("category", slugify(str(fd, "slug") || name), id ?? undefined),
    description: str(fd, "description") || null,
    image: str(fd, "image") || null,
  };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await logActivity(me, id ? "updated" : "created", "category", `${id ? "Updated" : "Created"} category "${name}"`);
  refreshAll();
  redirect("/admin/categories");
}

export async function deleteCategory(id: string) {
  const me = await requirePerm("categories");
  const c = await db.category.delete({ where: { id } });
  await logActivity(me, "deleted", "category", `Deleted category "${c.name}"`);
  refreshAll();
}

/* ================= Brands ================= */

export async function saveBrand(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("categories");
  const name = str(fd, "name");
  if (!name) return { error: "Brand name is required." };
  const data = {
    name,
    slug: await uniqueSlug("brand", slugify(str(fd, "slug") || name), id ?? undefined),
    description: str(fd, "description") || null,
    logo: str(fd, "logo") || null,
  };
  if (id) await db.brand.update({ where: { id }, data });
  else await db.brand.create({ data });
  await logActivity(me, id ? "updated" : "created", "brand", `${id ? "Updated" : "Created"} brand "${name}"`);
  refreshAll();
  redirect("/admin/brands");
}

export async function deleteBrand(id: string) {
  const me = await requirePerm("categories");
  const b = await db.brand.delete({ where: { id } });
  await logActivity(me, "deleted", "brand", `Deleted brand "${b.name}" (its products were kept, without a brand)`);
  refreshAll();
}

/* ================= Orders ================= */

async function setOrderStatus(orderIds: string[], status: string, paymentStatus?: string) {
  const settings = await db.setting.findUnique({ where: { id: 1 } });
  const orders = await db.order.findMany({ where: { id: { in: orderIds } }, include: { items: true } });
  for (const order of orders) {
    const restock = settings?.restockOnCancel !== false && status === "CANCELLED" && order.status !== "CANCELLED";
    const unRestock = settings?.restockOnCancel !== false && order.status === "CANCELLED" && status !== "CANCELLED";
    let pay = paymentStatus ?? order.paymentStatus;
    if (status === "DELIVERED" && settings?.autoPaidOnDelivery && pay === "PENDING") pay = "PAID";
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status, paymentStatus: pay } }),
      ...order.items
        .filter((i) => i.productId && (restock || unRestock))
        .map((i) =>
          db.product.update({
            where: { id: i.productId! },
            data: { stock: restock ? { increment: i.quantity } : { decrement: i.quantity } },
          })
        ),
    ]);
  }
  return orders.length;
}

export async function updateOrder(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("orders");
  const status = str(fd, "status");
  const paymentStatus = str(fd, "paymentStatus");
  if (!ORDER_STATUSES.includes(status as never)) return { error: "Invalid status." };
  if (!PAYMENT_STATUSES.includes(paymentStatus as never)) return { error: "Invalid payment status." };
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { error: "Order not found." };

  await setOrderStatus([id], status, paymentStatus);
  await db.order.update({ where: { id }, data: { notes: str(fd, "notes") || null } });
  await logActivity(me, "updated", "order", `Order ${order.orderNumber}: ${order.status} → ${status}, payment ${paymentStatus}`, id);
  revalidatePath("/admin", "layout");
  return { success: "Order updated." };
}

export async function deleteOrder(id: string) {
  const me = await requirePerm("orders");
  const o = await db.order.delete({ where: { id } });
  await logActivity(me, "deleted", "order", `Deleted order ${o.orderNumber}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/orders");
}

export async function bulkOrders(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("orders");
  const ids = fd.getAll("ids").map(String);
  const op = str(fd, "op");
  if (!ids.length) return { error: "Select at least one order." };
  let msg = "";
  if (op === "delete") {
    await db.order.deleteMany({ where: { id: { in: ids } } });
    msg = `Deleted ${plural(ids.length, "order")}`;
  } else if (op === "paid") {
    await db.order.updateMany({ where: { id: { in: ids } }, data: { paymentStatus: "PAID" } });
    msg = `Marked ${plural(ids.length, "order")} as paid`;
  } else if (ORDER_STATUSES.includes(op as never)) {
    const n = await setOrderStatus(ids, op);
    msg = `Marked ${plural(n, "order")} as ${op.toLowerCase()}`;
  } else return { error: "Choose a bulk action." };
  await logActivity(me, "bulk", "order", msg);
  revalidatePath("/admin", "layout");
  return { success: msg };
}

/* ================= Customers ================= */

export async function saveCustomer(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("customers");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Name and valid email are required." };
  if (!id && password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password && password.length < 6) return { error: "Password must be at least 6 characters." };

  const clash = await db.user.findUnique({ where: { email } });
  if (clash && clash.id !== id) return { error: "Email already in use." };

  const data = {
    name,
    email,
    phone: str(fd, "phone") || null,
    address: str(fd, "address") || null,
    city: str(fd, "city") || null,
    postalCode: str(fd, "postalCode") || null,
    country: str(fd, "country") || null,
    ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
  };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, password: await bcrypt.hash(password, 10) } });
  await logActivity(me, id ? "updated" : "created", "customer", `${id ? "Updated" : "Created"} customer ${email}`);
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export async function toggleUserActive(id: string) {
  const me = await requireStaff();
  if (id === me.id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return;
  // Customers need the "customers" permission; team members need "team"; super admins only by super admins.
  if (u.role === "CUSTOMER" && !hasPerm(me, "customers")) return;
  if (u.role === "STAFF" && !hasPerm(me, "team")) return;
  if (u.role === "ADMIN" && me.role !== "ADMIN") return;
  if (u.active && u.role === "ADMIN" && (await wouldRemoveLastAdmin([id]))) return;
  await db.user.update({ where: { id }, data: { active: !u.active } });
  await logActivity(me, "updated", "customer", `${u.active ? "Suspended" : "Re-activated"} ${u.email}`, id);
  revalidatePath("/admin", "layout");
}

export async function deleteCustomer(id: string) {
  const me = await requirePerm("customers");
  if (id === me.id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return;
  if (u.role !== "CUSTOMER" && me.role !== "ADMIN") return;
  if (u.role === "ADMIN" && (await wouldRemoveLastAdmin([id]))) return;
  await db.user.delete({ where: { id } });
  await logActivity(me, "deleted", "customer", `Deleted user ${u.email}`);
  revalidatePath("/admin", "layout");
}

export async function bulkCustomers(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("customers");
  const ids = fd.getAll("ids").map(String).filter((x) => x !== me.id);
  const op = str(fd, "op");
  if (!ids.length) return { error: "Select at least one customer (you can't change your own account here)." };
  // Bulk operations only touch customer accounts; team members are managed on the Team page.
  const where = { id: { in: ids }, role: "CUSTOMER" };
  let count = 0;
  if (op === "suspend") count = (await db.user.updateMany({ where, data: { active: false } })).count;
  else if (op === "activate") count = (await db.user.updateMany({ where, data: { active: true } })).count;
  else if (op === "delete") count = (await db.user.deleteMany({ where })).count;
  else return { error: "Choose a bulk action." };
  const verb = op === "suspend" ? "Suspended" : op === "activate" ? "Re-activated" : "Deleted";
  const msg = `${verb} ${plural(count, "customer")}`;
  await logActivity(me, "bulk", "customer", msg);
  revalidatePath("/admin", "layout");
  return { success: msg };
}

/* ================= Team & access ================= */

export async function saveTeamMember(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("team");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const role = str(fd, "role") === "ADMIN" ? "ADMIN" : "STAFF";
  const valid = PERMISSIONS.map((p) => p.key) as string[];
  const permissions = fd.getAll("permissions").map(String).filter((p) => valid.includes(p));

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Name and a valid email are required." };
  if (password && password.length < 6) return { error: "Password must be at least 6 characters." };
  if (role === "ADMIN" && me.role !== "ADMIN") return { error: "Only super admins can create other super admins." };
  if (role === "STAFF" && !permissions.length) return { error: "Give staff members at least one permission." };
  // Staff with "team" permission cannot grant permissions they don't have themselves.
  if (me.role !== "ADMIN") {
    const mine = parsePermissions(me.permissions);
    if (permissions.some((p) => !mine.includes(p as never))) return { error: "You can't grant permissions you don't have." };
  }

  let target = id ? await db.user.findUnique({ where: { id } }) : await db.user.findUnique({ where: { email } });
  if (id && !target) return { error: "User not found." };
  if (target && target.role === "ADMIN" && me.role !== "ADMIN") return { error: "Only super admins can edit super admins." };
  if (target?.id === me.id && role !== "ADMIN" && me.role === "ADMIN") return { error: "You can't downgrade your own super admin access." };
  if (id) {
    const clash = await db.user.findUnique({ where: { email } });
    if (clash && clash.id !== id) return { error: "That email belongs to another account." };
  }
  if (!target && password.length < 6) return { error: "Set a password (6+ characters) for the new member." };

  const data = {
    name,
    email,
    role,
    permissions: JSON.stringify(role === "ADMIN" ? [] : permissions),
    active: true,
    ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
  };

  if (target) {
    target = await db.user.update({ where: { id: target.id }, data });
    await logActivity(me, "updated", "team", `Set ${email} as ${role === "ADMIN" ? "super admin" : `staff (${permissions.join(", ")})`}`, target.id);
  } else {
    target = await db.user.create({ data: { ...data, password: await bcrypt.hash(password, 10) } });
    await logActivity(me, "created", "team", `Added ${email} as ${role === "ADMIN" ? "super admin" : "staff"}`, target.id);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/team?saved=1");
}

export async function revokeAccess(id: string) {
  const me = await requirePerm("team");
  if (id === me.id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.role === "CUSTOMER") return;
  if (u.role === "ADMIN" && (me.role !== "ADMIN" || (await wouldRemoveLastAdmin([id])))) return;
  await db.user.update({ where: { id }, data: { role: "CUSTOMER", permissions: "[]" } });
  await logActivity(me, "updated", "team", `Removed dashboard access for ${u.email}`, id);
  revalidatePath("/admin", "layout");
}

export async function removeTeamMember(id: string) {
  const me = await requireAdmin();
  if (id === me.id) return;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return;
  if (u.role === "ADMIN" && (await wouldRemoveLastAdmin([id]))) return;
  await db.user.delete({ where: { id } });
  await logActivity(me, "deleted", "team", `Deleted team member ${u.email}`);
  revalidatePath("/admin", "layout");
}

/* ================= Coupons ================= */

export async function saveCoupon(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("coupons");
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  const type = str(fd, "type") === "FIXED" ? "FIXED" : "PERCENT";
  const value = num(fd, "value");
  if (!code) return { error: "Coupon code is required." };
  if (value == null || isNaN(value) || value <= 0) return { error: "Enter a valid discount value." };
  if (type === "PERCENT" && value > 100) return { error: "Percentage cannot exceed 100." };

  const clash = await db.coupon.findUnique({ where: { code } });
  if (clash && clash.id !== id) return { error: "A coupon with this code already exists." };

  const expires = str(fd, "expiresAt");
  const data = {
    code,
    type,
    value,
    minOrder: num(fd, "minOrder") ?? 0,
    maxUses: num(fd, "maxUses"),
    expiresAt: expires ? new Date(expires + "T23:59:59") : null,
    active: fd.get("active") === "on",
  };
  if (id) await db.coupon.update({ where: { id }, data });
  else await db.coupon.create({ data });
  await logActivity(me, id ? "updated" : "created", "coupon", `${id ? "Updated" : "Created"} coupon ${code}`);
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function toggleCoupon(id: string) {
  const me = await requirePerm("coupons");
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) return;
  await db.coupon.update({ where: { id }, data: { active: !c.active } });
  await logActivity(me, "updated", "coupon", `${c.active ? "Deactivated" : "Activated"} coupon ${c.code}`);
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  const me = await requirePerm("coupons");
  const c = await db.coupon.delete({ where: { id } });
  await logActivity(me, "deleted", "coupon", `Deleted coupon ${c.code}`);
  revalidatePath("/admin/coupons");
}

/* ================= Reviews ================= */

export async function toggleReview(id: string) {
  const me = await requirePerm("reviews");
  const r = await db.review.findUnique({ where: { id }, include: { product: true } });
  if (!r) return;
  await db.review.update({ where: { id }, data: { approved: !r.approved } });
  await logActivity(me, "updated", "review", `${r.approved ? "Hid" : "Approved"} a review on "${r.product.name}"`);
  revalidatePath("/admin", "layout");
  revalidatePath(`/products/${r.product.slug}`);
}

export async function deleteReview(id: string) {
  const me = await requirePerm("reviews");
  await db.review.delete({ where: { id } });
  await logActivity(me, "deleted", "review", "Deleted a review");
  refreshAll();
}

export async function bulkReviews(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("reviews");
  const ids = fd.getAll("ids").map(String);
  const op = str(fd, "op");
  if (!ids.length) return { error: "Select at least one review." };
  if (op === "approve") await db.review.updateMany({ where: { id: { in: ids } }, data: { approved: true } });
  else if (op === "hide") await db.review.updateMany({ where: { id: { in: ids } }, data: { approved: false } });
  else if (op === "delete") await db.review.deleteMany({ where: { id: { in: ids } } });
  else return { error: "Choose a bulk action." };
  const msg = `${op === "approve" ? "Approved" : op === "hide" ? "Hid" : "Deleted"} ${plural(ids.length, "review")}`;
  await logActivity(me, "bulk", "review", msg);
  refreshAll();
  return { success: msg };
}

/* ================= Messages & subscribers ================= */

export async function toggleMessageRead(id: string) {
  await requirePerm("messages");
  const m = await db.message.findUnique({ where: { id } });
  if (m) await db.message.update({ where: { id }, data: { read: !m.read } });
  revalidatePath("/admin", "layout");
}

export async function markAllMessagesRead() {
  const me = await requirePerm("messages");
  const { count } = await db.message.updateMany({ where: { read: false }, data: { read: true } });
  await logActivity(me, "bulk", "message", `Marked ${plural(count, "message")} as read`);
  revalidatePath("/admin", "layout");
}

export async function deleteMessage(id: string) {
  const me = await requirePerm("messages");
  await db.message.delete({ where: { id } });
  await logActivity(me, "deleted", "message", "Deleted a contact message");
  revalidatePath("/admin", "layout");
}

export async function deleteSubscriber(id: string) {
  const me = await requirePerm("messages");
  const s = await db.subscriber.delete({ where: { id } });
  await logActivity(me, "deleted", "subscriber", `Removed subscriber ${s.email}`);
  revalidatePath("/admin/messages");
}

/* ================= Settings & automations ================= */

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("settings");
  const storeName = str(fd, "storeName");
  if (!storeName) return { error: "Store name is required." };
  const currency = str(fd, "currency").toUpperCase() || "USD";
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency });
  } catch {
    return { error: "Invalid currency code (use ISO codes like USD, EUR, PKR)." };
  }
  const data = {
    storeName,
    tagline: str(fd, "tagline"),
    contactEmail: str(fd, "contactEmail"),
    contactPhone: str(fd, "contactPhone"),
    currency,
    shippingFee: num(fd, "shippingFee") ?? 0,
    freeShippingThreshold: num(fd, "freeShippingThreshold") ?? 0,
    taxRate: num(fd, "taxRate") ?? 0,
    announcement: str(fd, "announcement") || null,
  };
  await db.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidateTag(SETTINGS_TAG);
  await logActivity(me, "updated", "settings", "Updated store settings");
  refreshAll();
  return { success: "Settings saved." };
}

export async function saveAutomations(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePerm("settings");
  const data = {
    autoHideOutOfStock: fd.get("autoHideOutOfStock") === "on",
    autoPaidOnDelivery: fd.get("autoPaidOnDelivery") === "on",
    restockOnCancel: fd.get("restockOnCancel") === "on",
    reviewModeration: fd.get("reviewModeration") === "on",
    lowStockThreshold: Math.max(0, Math.floor(num(fd, "lowStockThreshold") ?? 5)),
    staleOrderDays: Math.max(1, Math.floor(num(fd, "staleOrderDays") ?? 7)),
  };
  await db.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  revalidateTag(SETTINGS_TAG);
  await logActivity(me, "updated", "automation", "Updated automation rules");
  refreshAll();
  return { success: "Automation rules saved." };
}

export type AutomationTask = "hide_out_of_stock" | "expire_coupons" | "cancel_stale" | "paid_delivered" | "unfeature_out_of_stock";

export async function runAutomation(task: AutomationTask): Promise<{ message: string }> {
  const me = await requirePerm("settings");
  const s = await db.setting.findUnique({ where: { id: 1 } });
  let message = "";

  if (task === "hide_out_of_stock") {
    const { count } = await db.product.updateMany({ where: { stock: { lte: 0 }, active: true }, data: { active: false } });
    message = `Hid ${plural(count, "out-of-stock product")}`;
  } else if (task === "unfeature_out_of_stock") {
    const { count } = await db.product.updateMany({ where: { stock: { lte: 0 }, featured: true }, data: { featured: false } });
    message = `Removed ${plural(count, "out-of-stock product")} from featured`;
  } else if (task === "expire_coupons") {
    const now = new Date();
    const coupons = await db.coupon.findMany({ where: { active: true } });
    const dead = coupons.filter((c) => (c.expiresAt && c.expiresAt < now) || (c.maxUses != null && c.usedCount >= c.maxUses));
    await db.coupon.updateMany({ where: { id: { in: dead.map((c) => c.id) } }, data: { active: false } });
    message = `Deactivated ${plural(dead.length, "expired or used-up coupon")}`;
  } else if (task === "cancel_stale") {
    const days = s?.staleOrderDays ?? 7;
    const cutoff = new Date(Date.now() - days * 86400000);
    const stale = await db.order.findMany({ where: { status: "PENDING", paymentStatus: "PENDING", createdAt: { lt: cutoff } }, select: { id: true } });
    const n = await setOrderStatus(stale.map((o) => o.id), "CANCELLED");
    message = `Cancelled ${plural(n, "unpaid order")} older than ${days} days`;
  } else if (task === "paid_delivered") {
    const { count } = await db.order.updateMany({ where: { status: "DELIVERED", paymentStatus: "PENDING" }, data: { paymentStatus: "PAID" } });
    message = `Marked ${plural(count, "delivered order")} as paid`;
  }

  await logActivity(me, "automation", "automation", message);
  refreshAll();
  return { message };
}

export async function clearActivityLog(olderThanDays: number) {
  const me = await requireAdmin();
  const cutoff = new Date(Date.now() - olderThanDays * 86400000);
  const { count } = await db.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await logActivity(me, "deleted", "activity", `Cleared ${count} log ${count === 1 ? "entry" : "entries"} older than ${olderThanDays} days`);
  revalidatePath("/admin/activity");
}
