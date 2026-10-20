import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Copy, Eye, EyeOff, Pencil, Star, Trash2, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cn, formatPrice, parseImages } from "@/lib/utils";
import { bulkProducts, deleteProduct, duplicateProduct, toggleProductActive } from "@/actions/admin";
import { EmptyRow, ExportLink, FilterBar, PageHeader } from "@/components/admin/ui";
import { BulkForm, RowCheck, SelectAll, type BulkOp } from "@/components/admin/BulkBar";
import { InlineStock } from "@/components/admin/InlineStock";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SafeImage } from "@/components/ui/SafeImage";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Products" };

type SP = { q?: string; category?: string; status?: string; sort?: string; per?: string; page?: string; saved?: string };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePerm("products");
  const sp = await searchParams;
  const settings = await getSettings();
  const perPage = [15, 30, 60, 100].includes(Number(sp.per)) ? Number(sp.per) : 15;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }];
  if (sp.category === "none") where.categoryId = null;
  else if (sp.category) where.categoryId = sp.category;
  if (sp.status === "active") where.active = true;
  if (sp.status === "inactive") where.active = false;
  if (sp.status === "low") where.stock = { lte: settings.lowStockThreshold };
  if (sp.status === "out") where.stock = { lte: 0 };
  if (sp.status === "featured") where.featured = true;
  if (sp.status === "sale") where.comparePrice = { not: null };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sp.sort === "name" ? { name: "asc" }
    : sp.sort === "price-asc" ? { price: "asc" }
    : sp.sort === "price-desc" ? { price: "desc" }
    : sp.sort === "stock-asc" ? { stock: "asc" }
    : sp.sort === "stock-desc" ? { stock: "desc" }
    : sp.sort === "oldest" ? { createdAt: "asc" }
    : { createdAt: "desc" };

  const [total, products, categories, stats] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, include: { category: true }, orderBy, skip: (page - 1) * perPage, take: perPage }),
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.product.aggregate({ _sum: { stock: true }, _count: true }),
  ]);
  const inventoryValue = (await db.product.findMany({ select: { price: true, stock: true } })).reduce((s, p) => s + p.price * Math.max(0, p.stock), 0);

  const ops: BulkOp[] = [
    { value: "activate", label: "Publish (show in store)" },
    { value: "deactivate", label: "Hide from store" },
    { value: "feature", label: "Mark as featured" },
    { value: "unfeature", label: "Remove from featured" },
    { value: "sale", label: "Start flash sale (% off)", input: { type: "number", placeholder: "Discount %, e.g. 20" } },
    { value: "end_sale", label: "End sale (restore prices)" },
    { value: "price_pct", label: "Adjust price by %", input: { type: "number", placeholder: "e.g. 10 or -15" } },
    { value: "set_stock", label: "Set stock to…", input: { type: "number", placeholder: "Quantity" } },
    { value: "add_stock", label: "Add / remove stock", input: { type: "number", placeholder: "e.g. 50 or -5" } },
    {
      value: "category",
      label: "Move to category",
      input: { type: "select", options: [{ value: "", label: "Uncategorized" }, ...categories.map((c) => ({ value: c.id, label: c.name }))] },
    },
    { value: "delete", label: "Delete permanently", danger: true },
  ];

  return (
    <div>
      <PageHeader title="Products" description="Manage your catalog, inventory and pricing." action={{ href: "/admin/products/new", label: "Add product" }}>
        <ExportLink type="products" />
        <Link href="/admin/products/import" className="btn-secondary"><Upload className="h-4 w-4" /> Import</Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-slate-500">Total products</p><p className="mt-1 text-xl font-bold">{stats._count}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Units in stock</p><p className="mt-1 text-xl font-bold">{(stats._sum.stock ?? 0).toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Inventory value (retail)</p><p className="mt-1 text-xl font-bold">{formatPrice(inventoryValue, settings.currency)}</p></div>
      </div>

      {sp.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Product saved successfully.</p>}

      <FilterBar q={sp.q} placeholder="Search by name or SKU…">
        <select name="category" defaultValue={sp.category ?? ""} className="input !w-auto">
          <option value="">All categories</option>
          <option value="none">Uncategorized</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-auto">
          <option value="">All statuses</option>
          <option value="active">Published</option>
          <option value="inactive">Hidden</option>
          <option value="featured">Featured</option>
          <option value="sale">On sale</option>
          <option value="low">Low stock (≤{settings.lowStockThreshold})</option>
          <option value="out">Out of stock</option>
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} className="input !w-auto">
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="stock-asc">Stock ↑</option>
          <option value="stock-desc">Stock ↓</option>
        </select>
        <select name="per" defaultValue={String(perPage)} className="input !w-auto">
          {[15, 30, 60, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </FilterBar>

      <BulkForm id="bulk-products" action={bulkProducts} ops={ops} noun="product" />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-10"><SelectAll form="bulk-products" /></th>
              <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td><RowCheck form="bulk-products" value={p.id} label={`Select ${p.name}`} /></td>
                <td>
                  <div className="flex items-center gap-3">
                    <SafeImage src={parseImages(p.images)[0]} alt={p.name} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-semibold hover:text-brand-600">{p.name}</Link>
                      <p className="text-xs text-slate-400">{p.sku || "No SKU"}</p>
                    </div>
                    {p.featured && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
                  </div>
                </td>
                <td className="text-slate-600">{p.category?.name ?? "—"}</td>
                <td className="whitespace-nowrap">
                  <span className="font-semibold">{formatPrice(p.price, settings.currency)}</span>
                  {p.comparePrice && (
                    <>
                      <span className="ml-1 text-xs text-slate-400 line-through">{formatPrice(p.comparePrice, settings.currency)}</span>
                      <span className="ml-1 badge bg-red-100 text-red-700">-{Math.round((1 - p.price / p.comparePrice) * 100)}%</span>
                    </>
                  )}
                </td>
                <td><InlineStock id={p.id} stock={p.stock} low={settings.lowStockThreshold} /></td>
                <td>
                  <span className={cn("badge", p.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600")}>{p.active ? "Published" : "Hidden"}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <ConfirmButton action={toggleProductActive.bind(null, p.id)} className="btn-ghost !p-2" title={p.active ? "Hide from store" : "Publish"}>
                      {p.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </ConfirmButton>
                    <ConfirmButton action={duplicateProduct.bind(null, p.id)} className="btn-ghost !p-2" title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </ConfirmButton>
                    <Link href={`/admin/products/${p.id}`} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    <ConfirmButton
                      action={deleteProduct.bind(null, p.id)}
                      message={`Delete "${p.name}"? This cannot be undone.`}
                      className="btn-ghost !p-2 text-red-600 hover:!bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {!products.length && <EmptyRow cols={7} text="No products match these filters." />}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing {products.length ? (page - 1) * perPage + 1 : 0}–{(page - 1) * perPage + products.length} of {total}
        </p>
        <Pagination page={page} totalPages={Math.ceil(total / perPage)} basePath="/admin/products" params={sp} />
      </div>
    </div>
  );
}
