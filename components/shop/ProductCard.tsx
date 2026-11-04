import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { Stars } from "@/components/ui/Stars";
import { cn, formatPrice, parseImages } from "@/lib/utils";
import { AddToCartBar, QuickAdd, WishlistButton } from "./ProductActions";

export type CardProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string;
  featured?: boolean;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  rating?: number;
  reviewCount?: number;
};

function Eyebrow({ product }: { product: CardProduct }) {
  const parts = [product.brand?.name, product.category?.name].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="truncate text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
      {product.brand && <span className="text-brand-600">{product.brand.name}</span>}
      {product.brand && product.category && " · "}
      {product.category?.name}
    </p>
  );
}

function meta(product: CardProduct) {
  const images = parseImages(product.images);
  const onSale = !!product.comparePrice && product.comparePrice > product.price;
  const off = onSale ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100) : 0;
  const item = { productId: product.id, slug: product.slug, name: product.name, price: product.price, image: images[0] ?? "", stock: product.stock };
  return { images, onSale, off, item };
}

function Badges({ product, off }: { product: CardProduct; off: number }) {
  return (
    <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 sm:top-3 sm:left-3">
      {off > 0 && <span className="rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-extrabold text-white uppercase">-{off}%</span>}
      {product.featured && off === 0 && (
        <span className="rounded-md bg-brand-400 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-slate-950 uppercase">Bestseller</span>
      )}
      {product.stock <= 0 && <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white uppercase">Sold out</span>}
    </div>
  );
}

function StockLine({ stock }: { stock: number }) {
  if (stock <= 0) return <p className="text-xs font-semibold text-slate-400">Out of stock</p>;
  if (stock <= 5) return <p className="text-xs font-semibold text-amber-600">● Only {stock} left</p>;
  return <p className="text-xs font-semibold text-emerald-600">● In stock</p>;
}

export function ProductCard({ product, currency }: { product: CardProduct; currency: string }) {
  const { images, onSale, off, item } = meta(product);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:border-slate-300 hover:shadow-[0_16px_36px_-12px_rgba(15,23,42,0.18)]">
      {/* Fixed square image area: photos are contained, never stretched or cropped, and the card never jumps while loading. */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/70">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 block p-4 sm:p-6" aria-label={product.name}>
          <span className="relative block h-full w-full">
            <SafeImage
              src={images[0]}
              alt={product.name}
              className={cn(
                "absolute inset-0 h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105",
                images[1] && "group-hover:opacity-0"
              )}
            />
            {images[1] && (
              <SafeImage
                src={images[1]}
                alt=""
                className="absolute inset-0 h-full w-full object-contain opacity-0 mix-blend-multiply transition duration-500 group-hover:opacity-100"
              />
            )}
          </span>
        </Link>
        <Badges product={product} off={off} />
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <WishlistButton item={item} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <Eyebrow product={product} />
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm leading-snug font-bold text-slate-900 hover:text-brand-700 sm:text-[15px]">
          {product.name}
        </Link>
        {product.reviewCount ? (
          <div className="flex items-center gap-1.5">
            <Stars rating={product.rating ?? 0} />
            <span className="text-xs text-slate-400">({product.reviewCount})</span>
          </div>
        ) : null}
        <StockLine stock={product.stock} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className={cn("text-base font-extrabold sm:text-lg", onSale ? "text-red-600" : "text-slate-900")}>{formatPrice(product.price, currency)}</p>
            {onSale && <p className="text-xs text-slate-400 line-through">{formatPrice(product.comparePrice!, currency)}</p>}
          </div>
          <QuickAdd item={item} />
        </div>
      </div>
    </div>
  );
}

export function ProductRow({ product, currency }: { product: CardProduct; currency: string }) {
  const { images, onSale, off, item } = meta(product);
  return (
    <div className="card group flex gap-4 overflow-hidden p-3 transition hover:shadow-md sm:gap-6 sm:p-4">
      <Link href={`/products/${product.slug}`} className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white sm:w-44">
        <SafeImage src={images[0]} alt={product.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" />
        <Badges product={product} off={off} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Eyebrow product={product} />
        <Link href={`/products/${product.slug}`} className="text-base font-semibold hover:text-brand-600 sm:text-lg">{product.name}</Link>
        {product.reviewCount ? (
          <div className="mt-1 flex items-center gap-1.5">
            <Stars rating={product.rating ?? 0} />
            <span className="text-xs text-slate-400">{(product.rating ?? 0).toFixed(1)} · {product.reviewCount} reviews</span>
          </div>
        ) : null}
        {product.description && <p className="mt-2 line-clamp-2 hidden text-sm text-slate-500 sm:block">{product.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-bold", onSale && "text-red-600")}>{formatPrice(product.price, currency)}</span>
            {onSale && <span className="text-sm text-slate-400 line-through">{formatPrice(product.comparePrice!, currency)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <WishlistButton item={item} />
            <div className="w-36"><AddToCartBar item={item} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
