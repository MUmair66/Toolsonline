import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteCategory } from "@/actions/admin";
import { EmptyRow, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  await requirePerm("categories");
  const categories = await db.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="Categories" description="Organize your products into collections." action={{ href: "/admin/categories/new", label: "Add category" }} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Category</th><th>Slug</th><th>Products</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td>
                  <div className="flex items-center gap-3">
                    <SafeImage src={c.image} alt={c.name} className="h-11 w-11 rounded-lg object-cover" />
                    <div>
                      <Link href={`/admin/categories/${c.id}`} className="font-semibold hover:text-brand-600">{c.name}</Link>
                      {c.description && <p className="line-clamp-1 max-w-sm text-xs text-slate-500">{c.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="font-mono text-xs text-slate-500">{c.slug}</td>
                <td><Link href={`/admin/products?category=${c.id}`} className="hover:text-brand-600">{c._count.products}</Link></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/categories/${c.id}`} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    <ConfirmButton
                      action={deleteCategory.bind(null, c.id)}
                      message={`Delete "${c.name}"? Its products will become uncategorized.`}
                      className="btn-ghost !p-2 text-red-600 hover:!bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && <EmptyRow cols={4} text="No categories yet." />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
