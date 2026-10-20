import { requirePerm } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/Forms";

export const metadata = { title: "New category" };

export default async function NewCategoryPage() {
  await requirePerm("categories");
  return (
    <div>
      <PageHeader title="Add category" />
      <CategoryForm />
    </div>
  );
}
