import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePerm("products");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="Add product" description="Create a new product in your catalog." />
      <ProductForm categories={categories} />
    </div>
  );
}
