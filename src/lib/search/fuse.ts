import Fuse from "fuse.js";
import { ProductSearchItem } from "@/services/search/fuse-search.service";

/**
 * Factory function to create a configured Fuse.js instance for product searching.
 * 
 * @param products The pre-filtered list of search items
 * @returns A Fuse search instance configured with keys, weights, and typo tolerance
 */
export const createFuse = (products: ProductSearchItem[]) =>
  new Fuse(products, {
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
  });
