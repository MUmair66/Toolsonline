import { requirePerm } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/Forms";

export const metadata = { title: "New coupon" };

export default async function NewCouponPage() {
  await requirePerm("coupons");
  return (
    <div>
      <PageHeader title="Create coupon" />
      <CouponForm />
    </div>
  );
}
