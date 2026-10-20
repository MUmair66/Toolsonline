"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProduct } from "@/actions/admin";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { ImageUploader } from "./ImageUploader";

type P = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  categoryId: string | null;
  images: string[];
  featured: boolean;
  active: boolean;
};

export function ProductForm({ product, categories }: { product?: P; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveProduct.bind(null, product?.id ?? null), undefined);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">Basic information</h2>
          <div>
            <label className="label" htmlFor="name">Product name *</label>
            <input id="name" name="name" defaultValue={product?.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="slug">URL slug</label>
            <input id="slug" name="slug" defaultValue={product?.slug} className="input" placeholder="Auto-generated from name" />
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={7} defaultValue={product?.description} className="input" />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold">Images</h2>
          <ImageUploader name="images" initial={product?.images ?? []} />
          <p className="mt-2 text-xs text-slate-500">The first image is used as the main product image. Hover an image to reorder or remove it.</p>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Pricing & inventory</h2>
          <div>
            <label className="label" htmlFor="price">Price *</label>
            <input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product?.price} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="comparePrice">Compare-at price</label>
            <input id="comparePrice" name="comparePrice" type="number" step="0.01" min="0" defaultValue={product?.comparePrice ?? ""} className="input" placeholder="Original price (shows as sale)" />
          </div>
          <div>
            <label className="label" htmlFor="stock">Stock quantity *</label>
            <input id="stock" name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="sku">SKU</label>
            <input id="sku" name="sku" defaultValue={product?.sku ?? ""} className="input" />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold">Organization</h2>
          <div>
            <label className="label" htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} className="input">
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span className="block text-sm font-medium">Visible in store</span>
              <span className="text-xs text-slate-500">Customers can see and buy this product</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input type="checkbox" name="featured" defaultChecked={product?.featured} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span className="block text-sm font-medium">Featured product</span>
              <span className="text-xs text-slate-500">Show on the homepage</span>
            </span>
          </label>
        </section>
        <div className="card space-y-3 p-6">
          <FormMessage state={state} />
          <SubmitButton className="w-full" pendingText="Saving...">{product ? "Save changes" : "Create product"}</SubmitButton>
          <Link href="/admin/products" className="btn-secondary w-full">Cancel</Link>
          {product && (
            <Link href={`/products/${product.slug}`} target="_blank" className="btn-ghost w-full">View in store ↗</Link>
          )}
        </div>
      </div>
    </form>
  );
}
