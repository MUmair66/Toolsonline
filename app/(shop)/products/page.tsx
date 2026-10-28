import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { PackageSearch } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { productIdsWithRating, visibleWhere, withRatings } from "@/lib/products";
import { ProductCard, ProductRow } from "@/components/shop/ProductCard";
import { ActiveFilters, FilterProvider, ProductFilters, ResultsShell, SortSelect, ViewToggle } from "@/components/shop/ProductFilters";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Shop" };

const PER_PAGE = 12;

type SP = {
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  min?: string;
  max?: string;
  rating?: string;
  instock?: string;
  sale?: string;
  featured?: string;
  view?: string;
  page?: string;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.page) || 1);
  const base = visibleWhere(settings);

  const and: Prisma.ProductWhereInput[] = [base];
  if (sp.q) and.push({ OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] });
  const slugs = (sp.category || "").split(",").filter(Boolean);
  if (slugs.length) and.push({ category: { slug: { in: slugs } } });
  const brandSlugs = (sp.brand || "").split(",").filter(Boolean);
  if (brandSlugs.length) and.push({ brand: { slug: { in: brandSlugs } } });
  const price: Prisma.FloatFilter = {};
  if (sp.min && !isNaN(Number(sp.min))) price.gte = Number(sp.min);
  if (sp.max && !isNaN(Number(sp.max))) price.lte = Number(sp.max);
  if (Object.keys(price).length) and.push({ price });
  if (sp.instock === "1") and.push({ stock: { gt: 0 } });
  if (sp.sale === "1") and.push({ comparePrice: { not: null } });
  if (sp.featured === "1") and.push({ featured: true });
  if (sp.rating && Number(sp.rating) > 0) and.push({ id: { in: await productIdsWithRating(Number(sp.rating)) } });
  const where: Prisma.ProductWhereInput = { AND: and };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sp.sort === "price-asc" ? [{ price: "asc" }]
    : sp.sort === "price-desc" ? [{ price: "desc" }]
    : sp.sort === "name" ? [{ name: "asc" }]
    : sp.sort === "newest" ? [{ createdAt: "desc" }]
    : [{ featured: "desc" }, { createdAt: "desc" }];

  let raw;
  const total = await db.product.count({ where });
  if (sp.sort === "discount") {
    // Discount % is computed, so sort in memory then paginate.
    const all = await db.product.findMany({ where, include: { category: true, brand: true } });
    const off = (p: { price: number; comparePrice: number | null }) => (p.comparePrice ? 1 - p.price / p.comparePrice : 0);
    raw = all.sort((a, b) => off(b) - off(a)).slice((page - 1) * PER_PAGE, page * PER_PAGE);
  } else {
    raw = await db.product.findMany({ where, orderBy, include: { category: true, brand: true }, skip: (page - 1) * PER_PAGE, take: PER_PAGE });
  }

  const [categories, brands, priceAgg] = await Promise.all([
    db.category.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
    db.brand.findMany({ include: { _count: { select: { products: { where: base } } } }, orderBy: { name: "asc" } }),
    db.product.aggregate({ where: base, _max: { price: true } }),
  ]);
  const products = await withRatings(raw);
  const totalPages = Math.ceil(total / PER_PAGE);
  const selectedCats = categories.filter((c) => slugs.includes(c.slug));
  const list = sp.view === "list";
  const selectedBrands = brands.filter((b) => brandSlugs.includes(b.slug));
  const activeCount = [sp.q, sp.category, sp.brand, sp.min || sp.max, sp.rating, sp.instock, sp.sale, sp.featured].filter(Boolean).length;

  const title =
    selectedCats.length === 1 && selectedBrands.length === 1 ? `${selectedBrands[0].name} ${selectedCats[0].name}`
    : selectedCats.length === 1 ? selectedCats[0].name
    : selectedBrands.length === 1 && !sp.category ? `${selectedBrands[0].name} products`
    : sp.q ? `Results for "${sp.q}"` : sp.sale ? "On sale" : "All products";

  return (
    <FilterProvider>
      <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="container-x py-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-500">
            {selectedCats.length === 1 && selectedCats[0].description ? selectedCats[0].description : "Filters update instantly as you choose them."}
          </p>
        </div>
      </div>

      <div className="container-x py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <ProductFilters
            categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products }))}
            brands={brands.filter((b) => b._count.products > 0).map((b) => ({ name: b.name, slug: b.slug, count: b._count.products }))}
            maxPrice={priceAgg._max.price ?? 100}
            activeCount={activeCount}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{total}</span> product{total === 1 ? "" : "s"} found
              </p>
              <div className="flex items-center gap-2">
                <SortSelect />
                <ViewToggle />
              </div>
            </div>
            <div className="mb-6">
              <ActiveFilters
                categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))}
                brandNames={Object.fromEntries(brands.map((b) => [b.slug, b.name]))}
              />
            </div>

            <ResultsShell>
              {products.length ? (
                list ? (
                  <div className="space-y-4">
                    {products.map((p) => <ProductRow key={p.id} product={p} currency={settings.currency} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
                    {products.map((p) => <ProductCard key={p.id} product={p} currency={settings.currency} />)}
                  </div>
                )
              ) : (
                <div className="card flex flex-col items-center px-6 py-20 text-center">
                  <PackageSearch className="h-12 w-12 text-slate-300" />
                  <h2 className="mt-4 text-lg font-semibold">No products match your filters</h2>
                  <p className="mt-1 text-sm text-slate-500">Try removing a filter or searching for something else.</p>
                </div>
              )}
              <div className="mt-10">
                <Pagination page={page} totalPages={totalPages} basePath="/products" params={sp} />
              </div>
            </ResultsShell>
          </div>
        </div>
      </div>
    </FilterProvider>
  );
}
