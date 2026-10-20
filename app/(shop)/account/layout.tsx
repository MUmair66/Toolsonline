import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loyalty } from "@/lib/loyalty";
import { isStaffRole } from "@/lib/permissions";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [spent, activeOrders, addressCount, reviewCount] = await Promise.all([
    db.order.aggregate({ where: { userId: user.id, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    db.order.count({ where: { userId: user.id, status: { in: ["PENDING", "PROCESSING", "SHIPPED"] } } }),
    db.address.count({ where: { userId: user.id } }),
    db.review.count({ where: { userId: user.id } }),
  ]);
  const l = loyalty(spent._sum.total ?? 0);

  return (
    <div className="bg-slate-50/60">
      <div className="container-x py-8 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <AccountNav
            user={{ name: user.name, email: user.email, staff: isStaffRole(user.role) }}
            tier={{ name: l.tier.name, color: l.tier.color, points: l.points }}
            counts={{ orders: activeOrders, addresses: addressCount, reviews: reviewCount }}
          />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
