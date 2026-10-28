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
    <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
      {off > 0 && <span className="badge bg-red-500 text-white shadow-sm">-{off}%</span>}
      {product.featured && off === 0 && <span className="badge bg-slate-900 text-white">Bestseller</span>}
      {product.stock <= 0 && <span className="badge bg-white/95 text-slate-900 shadow-sm">Sold out</span>}
      {product.stock > 0 && product.stock <= 5 && <span className="badge bg-amber-400 text-amber-950">Only {product.stock} left</span>}
    </div>
  );
}

export function ProductCard({ product, currency }: { product: CardProduct; currency: string }) {
  const { images, onSale, off, item } = meta(product);

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white transition group-hover:border-brand-300">
        <Link href={`/products/${product.slug}`} className="block h-full w-full" aria-label={product.name}>
          <SafeImage
            src={images[0]}
            alt={product.name}
            className={cn("absolute inset-0 h-full w-full object-contain transition duration-700 group-hover:scale-105", images[1] && "group-hover:opacity-0")}
          />
          {images[1] && (
            <SafeImage src={images[1]} alt="" className="absolute inset-0 h-full w-full scale-105 object-contain opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100" />
          )}
        </Link>
        <Badges product={product} off={off} />
        <div className="absolute top-3 right-3">
          <WishlistButton item={item} />
        </div>
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
          <AddToCartBar item={item} />
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Eyebrow product={product} />
            <Link href={`/products/${product.slug}`} className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900 hover:text-brand-600 sm:text-base">
              {product.name}
            </Link>
          </div>
          <div className="sm:hidden">
            <QuickAdd item={item} />
          </div>
        </div>
        {product.reviewCount ? (
          <div className="mt-1 flex items-center gap-1.5">
            <Stars rating={product.rating ?? 0} />
            <span className="text-xs text-slate-400">({product.reviewCount})</span>
          </div>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className={cn("text-base font-bold sm:text-lg", onSale && "text-red-600")}>{formatPrice(product.price, currency)}</span>
          {onSale && <span className="text-sm text-slate-400 line-through">{formatPrice(product.comparePrice!, currency)}</span>}
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
