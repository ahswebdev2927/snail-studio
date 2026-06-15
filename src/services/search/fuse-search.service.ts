import Fuse from "fuse.js";

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

  const options: Fuse.IFuseOptions<ProductSearchItem> = {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "brandName", weight: 0.2 },
      { name: "categoryName", weight: 0.2 },
      { name: "attributes.value", weight: 0.15 },
      { name: "shortDescription", weight: 0.1 },
      { name: "description", weight: 0.05 },
    ],
    threshold: 0.3, // Typo-tolerance threshold
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  };

  const fuse = new Fuse(products, options);
  const results = fuse.search(trimmedQuery);

  return results.map((result) => result.item);
}
