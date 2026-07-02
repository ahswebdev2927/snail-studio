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
    searchable?: boolean;
    filterable?: boolean;
  }[];
  images: {
    url: string;
    isFeatured: boolean;
    sortOrder: number;
  }[];
  rating: number;
  reviewsCount: number;
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

  // Only index attributes where searchable is true (searchable !== false)
  const productsWithFilteredSearchKeys = products.map((p) => ({
    ...p,
    attributes: p.attributes.filter((attr) => attr.searchable !== false),
  }));

  const fuse = createFuse(productsWithFilteredSearchKeys);

  return fuse.search(trimmedQuery).map((res) => {
    // Return original product object to maintain full attribute payload downstream
    return products.find((p) => p.id === res.item.id)!;
  });
}
