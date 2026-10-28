import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    include: { _count: { select: { products: { where: { active: true } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">All categories</h1>
      <p className="mt-2 text-slate-500">Browse our full range of collections.</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/products?category=${c.slug}`} className="group card overflow-hidden transition hover:shadow-lg">
            <div className="aspect-[16/10] overflow-hidden bg-white p-4">
              <SafeImage src={c.image} alt={c.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold group-hover:text-brand-600">{c.name}</h2>
                <span className="badge bg-slate-100 text-slate-600">{c._count.products} items</span>
              </div>
              {c.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{c.description}</p>}
            </div>
          </Link>
        ))}
        {!categories.length && <p className="text-slate-500">No categories yet.</p>}
      </div>
    </div>
  );
}
