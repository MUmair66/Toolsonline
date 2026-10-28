// Shared shapes for catalog data files (one file per brand).

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
};

export type CatalogProduct = {
  /** Model code as printed by the brand, e.g. "AHS 801-4". Used to build the SKU. */
  model: string;
  /** Product type, e.g. "Angle Grinder". */
  type: string;
  /** Category slug (see categories.ts). */
  category: string;
  /** Spec lines shown on the product page. */
  specs: string[];
  /** Price in PKR. null = not yet priced ("Coming soon"): imported as a hidden draft. */
  price: number | null;
  /** Image key in storage: products/<brand>/<image>.webp. Omit when there is no photo yet. */
  image?: string;
  /** Short suffix to keep names unique when a brand reuses a model code, e.g. "3HP". */
  variant?: string;
  featured?: boolean;
};

export type CatalogBrand = {
  slug: string;
  name: string;
  description: string;
  products: CatalogProduct[];
};
