import Link from "next/link";
import { Award, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { deleteBrand } from "@/actions/admin";
import { EmptyRow, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { SafeImage } from "@/components/ui/SafeImage";

export const metadata = { title: "Brands" };

export default async function AdminBrands() {
  await requirePerm("categories");
  const brands = await db.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="Brands" description="The manufacturers you sell. Customers can filter the shop by brand." action={{ href: "/admin/brands/new", label: "Add brand" }} />
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Brand</th><th>Slug</th><th>Products</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td>
                  <div className="flex items-center gap-3">
                    {b.logo ? (
                      <SafeImage src={b.logo} alt={b.name} className="h-11 w-11 rounded-lg bg-slate-50 object-contain p-1" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Award className="h-5 w-5" /></span>
                    )}
                    <div>
                      <Link href={`/admin/brands/${b.id}`} className="font-semibold hover:text-brand-600">{b.name}</Link>
                      {b.description && <p className="line-clamp-1 max-w-md text-xs text-slate-500">{b.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="font-mono text-xs text-slate-500">{b.slug}</td>
                <td><Link href={`/admin/products?brand=${b.id}`} className="hover:text-brand-600">{b._count.products}</Link></td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/brands/${b.id}`} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    <ConfirmButton
                      action={deleteBrand.bind(null, b.id)}
                      message={`Delete brand "${b.name}"? Its products are kept but will have no brand.`}
                      className="btn-ghost !p-2 text-red-600 hover:!bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {!brands.length && <EmptyRow cols={4} text="No brands yet." />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
