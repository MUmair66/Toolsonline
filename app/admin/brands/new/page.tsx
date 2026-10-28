import { requirePerm } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "@/components/admin/Forms";

export const metadata = { title: "New brand" };

export default async function NewBrandPage() {
  await requirePerm("categories");
  return (
    <div>
      <PageHeader title="Add brand" />
      <BrandForm />
    </div>
  );
}
