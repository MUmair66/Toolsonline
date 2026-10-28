import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "@/components/admin/Forms";

export const metadata = { title: "Edit brand" };

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("categories");
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) notFound();
  return (
    <div>
      <PageHeader title="Edit brand" description={brand.name} />
      <BrandForm brand={brand} />
    </div>
  );
}
