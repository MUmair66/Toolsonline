import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { bulkReviews, deleteReview, toggleReview } from "@/actions/admin";
import { requirePerm } from "@/lib/auth";
import { BulkForm, RowCheck, SelectAll } from "@/components/admin/BulkBar";
import { FilterBar, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Stars } from "@/components/ui/Stars";
import { Pagination } from "@/components/ui/Pagination";

export const metadata = { title: "Reviews" };
const PER_PAGE = 20;

type SP = { q?: string; rating?: string; status?: string; page?: string };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePerm("reviews");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ReviewWhereInput = {};
  if (sp.q) where.OR = [{ comment: { contains: sp.q, mode: "insensitive" } }, { product: { name: { contains: sp.q, mode: "insensitive" } } }, { user: { name: { contains: sp.q, mode: "insensitive" } } }];
  if (sp.rating) where.rating = Number(sp.rating);
  if (sp.status === "visible") where.approved = true;
  if (sp.status === "hidden") where.approved = false;

  const [total, reviews] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true, id: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer product reviews." />
      <FilterBar q={sp.q} placeholder="Search reviews, products, users...">
        <select name="rating" defaultValue={sp.rating ?? ""} className="input !w-auto">
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-auto">
          <option value="">All</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden / pending</option>
        </select>
      </FilterBar>
      <BulkForm
        id="bulk-reviews"
        action={bulkReviews}
        noun="review"
        ops={[
          { value: "approve", label: "Approve / show" },
          { value: "hide", label: "Hide" },
          { value: "delete", label: "Delete permanently", danger: true },
        ]}
      />
      <label className="mb-3 flex items-center gap-2 px-1 text-sm text-slate-600"><SelectAll form="bulk-reviews" /> Select all on this page</label>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className={cn("card flex flex-wrap gap-4 p-5", !r.approved && "opacity-60")}>
            <RowCheck form="bulk-reviews" value={r.id} label="Select review" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} />
                <span className="text-sm font-semibold">{r.user.name}</span>
                <span className="text-xs text-slate-400">on</span>
                <Link href={`/admin/products/${r.product.id}`} className="text-sm font-medium text-brand-600 hover:underline">{r.product.name}</Link>
                <span className="text-xs text-slate-400">· {formatDate(r.createdAt)}</span>
                {!r.approved && <span className="badge bg-slate-200 text-slate-600">Hidden</span>}
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
            </div>
            <div className="flex items-start gap-1">
              <ConfirmButton action={toggleReview.bind(null, r.id)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                {r.approved ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
              </ConfirmButton>
              <ConfirmButton action={deleteReview.bind(null, r.id)} message="Delete this review?" className="btn-ghost !p-2 text-red-600 hover:!bg-red-50" title="Delete">
                <Trash2 className="h-4 w-4" />
              </ConfirmButton>
            </div>
          </div>
        ))}
        {!reviews.length && <div className="card p-12 text-center text-slate-500">No reviews found.</div>}
      </div>
      <div className="mt-6">
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} basePath="/admin/reviews" params={sp} />
      </div>
    </div>
  );
}
