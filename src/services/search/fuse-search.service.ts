import { createFuse } from "@/lib/search/fuse";

export interface ProductSearchItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  priceMin: number;
  priceMax: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  brandId: string | null;
  brandName: string | null;
  brandSlug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  attributes: {
    groupCode: string;
    groupName: string;
    value: string;
    valueCode: string;
  }[];
  images: {
    url: string;
    isFeatured: boolean;
    sortOrder: number;
  }[];
  createdAt: Date;
}

/**
 * Perform fuzzy searching on a dataset of products using Fuse.js.
 * 
 * @param products The pre-filtered list of products from the database
 * @param query The search query string
 * @returns Ranked and filtered products based on search query matching score
 */
export function searchWithFuse(products: ProductSearchItem[], query: string): ProductSearchItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return products;
  }

  const fuse = createFuse(products);
  const results = fuse.search(trimmedQuery);

  return results.map((result) => result.item);
}
