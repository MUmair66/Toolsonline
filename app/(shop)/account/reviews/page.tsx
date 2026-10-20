import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, Star, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate, parseImages } from "@/lib/utils";
import { deleteMyReview } from "@/actions/account";
import { Stars } from "@/components/ui/Stars";
import { SafeImage } from "@/components/ui/SafeImage";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export const metadata: Metadata = { title: "My reviews" };

export default async function MyReviewsPage() {
  const user = await requireUser();
  const [reviews, delivered] = await Promise.all([
    db.review.findMany({ where: { userId: user.id }, include: { product: { select: { name: true, slug: true, images: true } } }, orderBy: { createdAt: "desc" } }),
    db.orderItem.findMany({
      where: { order: { userId: user.id, status: "DELIVERED" }, productId: { not: null } },
      select: { product: { select: { id: true, name: true, slug: true, images: true } } },
    }),
  ]);
  const reviewed = new Set(reviews.map((r) => r.product.slug));
  const toReview = [...new Map(delivered.filter((d) => d.product && !reviewed.has(d.product.slug)).map((d) => [d.product!.id, d.product!])).values()].slice(0, 6);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My reviews</h1>
        <p className="mt-1 text-sm text-slate-500">
          {reviews.length ? `${reviews.length} review${reviews.length > 1 ? "s" : ""} · average ${avg.toFixed(1)} ★` : "Share your experience to help other shoppers."}
        </p>
      </div>

      {toReview.length > 0 && (
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold"><MessageSquarePlus className="h-5 w-5 text-brand-600" /> Waiting for your review</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {toReview.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}#reviews`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-400 hover:bg-brand-50/40">
                <SafeImage src={parseImages(p.images)[0]} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-brand-600"><Star className="h-3 w-3" /> Rate it</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card flex gap-4 p-5">
            <Link href={`/products/${r.product.slug}`} className="shrink-0">
              <SafeImage src={parseImages(r.product.images)[0]} alt={r.product.name} className="h-16 w-16 rounded-xl object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/products/${r.product.slug}`} className="font-semibold hover:text-brand-600">{r.product.name}</Link>
                <div className="flex items-center gap-2">
                  {!r.approved && <span className="badge bg-amber-100 text-amber-800">Awaiting approval</span>}
                  <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
              </div>
              <div className="mt-1"><Stars rating={r.rating} /></div>
              <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
            </div>
            <ConfirmButton action={deleteMyReview.bind(null, r.id)} message="Delete this review?" className="btn-ghost h-fit !p-2 text-slate-400 hover:!bg-red-50 hover:text-red-600" title="Delete review">
              <Trash2 className="h-4 w-4" />
            </ConfirmButton>
          </div>
        ))}
        {!reviews.length && !toReview.length && (
          <div className="card p-12 text-center text-sm text-slate-500">You haven&apos;t reviewed anything yet. Reviews unlock once an order is delivered.</div>
        )}
      </div>
    </div>
  );
}
