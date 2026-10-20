import { requirePerm } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseImages } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("products");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  return (
    <div>
      <PageHeader title="Edit product" description={product.name} />
      <ProductForm product={{ ...product, images: parseImages(product.images) }} categories={categories} />
    </div>
  );
}
