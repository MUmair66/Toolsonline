import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, Check, ChevronRight, Phone, ShieldCheck, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { visibleWhere, withRatings } from "@/lib/products";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { formatDate, formatPrice, parseImages } from "@/lib/utils";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { AddToCartPanel } from "@/components/shop/ProductActions";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReviewForm } from "@/components/shop/ReviewForm";
import { Stars } from "@/components/ui/Stars";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findUnique({ where: { slug } });
  return p ? { title: p.name, description: p.description.slice(0, 160) } : { title: "Product not found" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      brand: true,
      reviews: { where: { approved: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  const settings = await getSettings();
  if (!product || !product.active || (settings.autoHideOutOfStock && product.stock <= 0)) notFound();

  const [user, relatedRaw] = await Promise.all([
    getCurrentUser(),
    db.product.findMany({
      where: { ...visibleWhere(settings), categoryId: product.categoryId, id: { not: product.id } },
      include: { category: true, brand: true },
      take: 4,
    }),
  ]);
  const related = await withRatings(relatedRaw);
  const images = parseImages(product.images);
  const avg = product.reviews.length ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0;
  const onSale = product.comparePrice && product.comparePrice > product.price;
  const fmt = (n: number) => formatPrice(n, settings.currency);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: product.reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="container-x py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/products" className="hover:text-slate-900">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-slate-900">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={images} name={product.name} />

        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            {product.brand && (
              <Link href={`/products?brand=${product.brand.slug}`} className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-brand-600">
                {product.brand.name}
              </Link>
            )}
            {product.category && (
              <Link href={`/products?category=${product.category.slug}`} className="text-brand-600 hover:underline">
                {product.category.name}
              </Link>
            )}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <Stars rating={avg} size="md" />
            <a href="#reviews" className="text-sm text-slate-500 hover:underline">
              {product.reviews.length ? `${avg.toFixed(1)} · ${product.reviews.length} reviews` : "No reviews yet"}
            </a>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">{fmt(product.price)}</span>
            {onSale && (
              <>
                <span className="text-lg text-slate-400 line-through">{fmt(product.comparePrice!)}</span>
                <span className="badge bg-red-100 text-red-700">Save {fmt(product.comparePrice! - product.price)}</span>
              </>
            )}
          </div>

          <p className="mt-6 leading-relaxed whitespace-pre-line text-slate-600">{product.description}</p>

          <div className="mt-6 flex items-center gap-2 text-sm">
            {product.stock > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-emerald-700">
                  In stock{product.stock <= 10 ? ` — only ${product.stock} left` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="font-medium text-red-600">Out of stock</span>
              </>
            )}
            {product.sku && <span className="ml-auto text-slate-400">SKU: {product.sku}</span>}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <AddToCartPanel
              item={{ productId: product.id, slug: product.slug, name: product.name, price: product.price, image: images[0] ?? "", stock: product.stock }}
            />
          </div>

          <ul className="mt-8 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <li className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-brand-600" />
              {settings.freeShippingThreshold > 0
                ? `Free shipping on orders over ${fmt(settings.freeShippingThreshold)}`
                : `Shipping: ${fmt(settings.shippingFee)}`}
            </li>
            <li className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-brand-600" /> Cash on delivery available
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-600" /> Secure checkout
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-brand-600" />
              <span>Questions about this tool? <Link href="/contact" className="font-semibold text-brand-600 hover:underline">Contact us</Link></span>
            </li>
          </ul>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-20 scroll-mt-24">
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div>
            <div className="card p-6">
              <div className="flex items-center gap-4">
                <span className="text-5xl font-extrabold">{avg.toFixed(1)}</span>
                <div>
                  <Stars rating={avg} size="md" />
                  <p className="mt-1 text-sm text-slate-500">Based on {product.reviews.length} reviews</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-slate-600">{d.star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: product.reviews.length ? `${(d.count / product.reviews.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate-400">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card mt-6 p-6">
              {user ? (
                <ReviewForm productId={product.id} />
              ) : (
                <div className="text-center">
                  <p className="font-semibold">Share your thoughts</p>
                  <p className="mt-1 text-sm text-slate-500">Log in to write a review for this product.</p>
                  <Link href={`/login?next=/products/${product.slug}`} className="btn-primary mt-4 w-full">
                    Log in to review
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            {product.reviews.length ? (
              <ul className="divide-y divide-slate-100">
                {product.reviews.map((r) => (
                  <li key={r.id} className="py-6 first:pt-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
                        {r.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          {r.user.name}
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                            <Check className="h-3 w-3" /> Verified
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Stars rating={r.rating} />
                          <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-slate-600">{r.comment}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No reviews yet. Be the first to review this product!</p>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} currency={settings.currency} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed current={{ slug: product.slug, name: product.name, price: product.price, image: images[0] ?? "" }} />
    </div>
  );
}
