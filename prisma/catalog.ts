/**
 * Loads the product catalog (brands, categories, products) into the database.
 *
 *   npm run catalog:sync    add new products / update existing ones by SKU. Never deletes anything,
 *                           never touches orders or customers, and keeps the stock you set in admin.
 *   npm run catalog:reset   ONE-TIME store reset: deletes all orders, customers, reviews, coupons,
 *                           messages and the old catalog, keeps admin accounts, then loads the catalog.
 *
 * To add a brand: create prisma/data/<brand>.ts (see ahs.ts) and add it to BRANDS below.
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "./data/categories";
import { AHS } from "./data/ahs";
import type { CatalogBrand, CatalogProduct } from "./data/types";

const BRANDS: CatalogBrand[] = [AHS];
const DEFAULT_STOCK = 10; // stock for newly added products; adjust in Admin → Products

const db = new PrismaClient();
const reset = process.argv.includes("--reset");
const imageBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

const slugify = (s: string) =>
  s.toLowerCase().replace(/[″"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function productFields(brand: CatalogBrand, p: CatalogProduct) {
  const name = `${p.model} ${p.type}${p.variant ? ` (${p.variant})` : ""}`;
  const sku = slugify(`${p.model} ${p.variant ?? ""}`).toUpperCase();
  const description = [`${brand.name} ${p.type} — model ${p.model}${p.variant ? ` ${p.variant}` : ""}.`, "", "Specifications:", ...p.specs.map((s) => `• ${s}`)].join("\n");
  const images = p.image && imageBase ? [`${imageBase}/products/${brand.slug}/${p.image}.webp`] : [];
  return { name, sku, description, images };
}

async function wipe() {
  console.log("Reset: removing old data (admin accounts are kept)...");
  const counts = {
    orderItems: (await db.orderItem.deleteMany()).count,
    orders: (await db.order.deleteMany()).count,
    reviews: (await db.review.deleteMany()).count,
    addresses: (await db.address.deleteMany({ where: { user: { role: { not: "ADMIN" } } } })).count,
    coupons: (await db.coupon.deleteMany()).count,
    messages: (await db.message.deleteMany()).count,
    subscribers: (await db.subscriber.deleteMany()).count,
    activity: (await db.activityLog.deleteMany()).count,
    products: (await db.product.deleteMany()).count,
    categories: (await db.category.deleteMany()).count,
    brands: (await db.brand.deleteMany()).count,
    users: (await db.user.deleteMany({ where: { role: { not: "ADMIN" } } })).count,
  };
  console.log("  deleted:", counts);

  const settings = {
    storeName: "Toolsonline",
    tagline: "Your Hardware Partner",
    currency: "PKR",
    shippingFee: 300,
    freeShippingThreshold: 10000,
    taxRate: 0,
    announcement: "Genuine AHS power tools · Free delivery on orders over Rs. 10,000 · Cash on delivery available",
  };
  await db.setting.upsert({ where: { id: 1 }, update: settings, create: { id: 1, ...settings } });
  console.log("  store settings set to Toolsonline / PKR");
}

async function sync() {
  // Categories
  const catIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { slug: c.slug, name: c.name, description: c.description },
    });
    catIds.set(c.slug, row.id);
  }

  let created = 0;
  let updated = 0;
  for (const brand of BRANDS) {
    const b = await db.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description },
      create: { slug: brand.slug, name: brand.name, description: brand.description },
    });

    for (const p of brand.products) {
      const categoryId = catIds.get(p.category);
      if (!categoryId) throw new Error(`Unknown category "${p.category}" for ${p.model}`);
      const f = productFields(brand, p);
      const existing = await db.product.findFirst({ where: { sku: f.sku } });
      const data = {
        name: f.name,
        description: f.description,
        price: p.price ?? 0,
        categoryId,
        brandId: b.id,
        ...(f.images.length ? { images: JSON.stringify(f.images) } : {}),
      };
      if (existing) {
        // Keep stock / featured / visibility that may have been changed in admin.
        await db.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        let slug = slugify(f.name);
        for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = `${slugify(f.name)}-${i}`;
        await db.product.create({
          data: {
            ...data,
            slug,
            sku: f.sku,
            images: JSON.stringify(f.images),
            stock: p.price == null ? 0 : DEFAULT_STOCK,
            active: p.price != null, // "Coming soon" items are imported as hidden drafts
            featured: !!p.featured,
          },
        });
        created++;
      }
    }
  }

  // Give each category a cover image from its first product (only if it has none yet).
  for (const [slug, id] of catIds) {
    const cat = await db.category.findUnique({ where: { id } });
    if (cat?.image) continue;
    const first = await db.product.findFirst({ where: { categoryId: id, images: { not: "[]" } }, orderBy: { price: "asc" } });
    const img = first ? (JSON.parse(first.images) as string[])[0] : null;
    if (img) await db.category.update({ where: { id }, data: { image: img } });
    else console.log(`  (no cover image for category ${slug})`);
  }

  const totals = { products: await db.product.count(), active: await db.product.count({ where: { active: true } }), categories: await db.category.count(), brands: await db.brand.count() };
  console.log(`Catalog sync: ${created} created, ${updated} updated →`, totals);
}

async function main() {
  if (!imageBase) console.warn("⚠ R2_PUBLIC_URL is not set — products will be created without images.");
  if (reset) await wipe();
  await sync();
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  console.log("Admin accounts:", admins.map((a) => a.email).join(", ") || "NONE — create one!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
