import { requirePerm } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/Forms";

export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("categories");
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id } });
  if (!category) notFound();
  return (
    <div>
      <PageHeader title="Edit category" description={category.name} />
      <CategoryForm category={category} />
    </div>
  );
}
