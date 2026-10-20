import { requirePerm } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductImporter } from "@/components/admin/ProductImporter";

export const metadata = { title: "Bulk import" };

export default async function ImportPage() {
  await requirePerm("products");
  return (
    <div>
      <PageHeader title="Bulk import products" description="Add or update hundreds of products at once from a CSV / Excel export." />
      <ProductImporter />
    </div>
  );
}
