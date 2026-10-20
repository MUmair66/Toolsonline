import { requirePerm } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/Forms";

export const metadata = { title: "Edit coupon" };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("coupons");
  const { id } = await params;
  const coupon = await db.coupon.findUnique({ where: { id } });
  if (!coupon) notFound();
  return (
    <div>
      <PageHeader title="Edit coupon" description={coupon.code} />
      <CouponForm coupon={coupon} />
    </div>
  );
}
