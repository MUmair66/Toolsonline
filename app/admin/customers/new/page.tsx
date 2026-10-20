import { requirePerm } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CustomerForm } from "@/components/admin/Forms";

export const metadata = { title: "New user" };

export default async function NewCustomerPage() {
  await requirePerm("customers");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add user" description="Create a customer or admin account." />
      <CustomerForm />
    </div>
  );
}
