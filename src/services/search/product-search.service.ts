import { getFilteredProducts, FilterParams } from "./product-filter.service";
import { searchWithFuse, ProductSearchItem } from "./fuse-search.service";

export interface SearchQueryParams extends FilterParams {
  q?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  page?: number;
  limit?: number;
}

export interface FacetOption {
  id?: string;
  name: string;
  slug: string;
  count: number;
}

export interface AttributeFacet {
  groupCode: string;
  groupName: string;
  values: {
    value: string;
    code: string;
    count: number;
  }[];
}

export interface SearchFacets {
  categories: FacetOption[];
  brands: FacetOption[];
  attributes: AttributeFacet[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface SearchResponse {
  products: ProductSearchItem[];
  pagination: {
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets: SearchFacets;
}

/**
 * Main search orchestration service.
 * Applies DB filters, performs fuzzy searching via Fuse.js (if query is present),
 * handles sorting, extracts facets, and yields paginated results.
 */
export async function searchProducts(params: SearchQueryParams): Promise<SearchResponse> {
  const {
    q,
    sort = "relevance",
    page = 1,
    limit = 24,
    ...filterParams
  } = params;

  // 1. Fetch pre-filtered items from database
  let results = await getFilteredProducts(filterParams);

  // 2. Perform fuzzy ranking using Fuse.js if a text query exists
  const hasQuery = !!(q && q.trim());
  if (hasQuery) {
    results = searchWithFuse(results, q!);
  }

  // 3. Compute dynamic facets across all matching records (before pagination)
  const facets = calculateFacets(results);

  // 4. Sort results
  results = sortProducts(results, sort, hasQuery);

  // 5. Apply pagination offsets
  const totalItems = results.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * limit;
  const paginatedProducts = results.slice(offset, offset + limit);

  return {
    products: paginatedProducts,
    pagination: {
      totalItems,
      page: currentPage,
      limit,
      totalPages,
    },
    facets,
  };
}

/**
 * Aggregate unique categories, brands, attributes, and price boundaries from matching results.
 */
function calculateFacets(products: ProductSearchItem[]): SearchFacets {
  const categoriesMap = new Map<string, { name: string; slug: string; count: number }>();
  const brandsMap = new Map<string, { name: string; slug: string; count: number }>();
  
  // groupCode -> { groupName, valueMap }
  const attributesMap = new Map<string, { 
    groupName: string; 
    values: Map<string, { value: string; count: number }> 
  }>();

  let minPrice = Infinity;
  let maxPrice = -Infinity;

  for (const p of products) {
    // Categories
    if (p.categoryId && p.categoryName && p.categorySlug) {
      const existing = categoriesMap.get(p.categoryId) || { name: p.categoryName, slug: p.categorySlug, count: 0 };
      existing.count++;
      categoriesMap.set(p.categoryId, existing);
    }

    // Brands
    if (p.brandId && p.brandName && p.brandSlug) {
      const existing = brandsMap.get(p.brandId) || { name: p.brandName, slug: p.brandSlug, count: 0 };
      existing.count++;
      brandsMap.set(p.brandId, existing);
    }

    // Price Bounds
    if (p.priceMin < minPrice) minPrice = p.priceMin;
    if (p.priceMax > maxPrice) maxPrice = p.priceMax;

    // Attributes (Shape, Length, Color, Texture, Style, etc.)
    for (const attr of p.attributes) {
      let group = attributesMap.get(attr.groupCode);
      if (!group) {
        group = { groupName: attr.groupName, values: new Map() };
        attributesMap.set(attr.groupCode, group);
      }

      const valRecord = group.values.get(attr.valueCode) || { value: attr.value, count: 0 };
      valRecord.count++;
      group.values.set(attr.valueCode, valRecord);
    }
  }

  // Format category list
  const categoriesList: FacetOption[] = Array.from(categoriesMap.entries()).map(([id, item]) => ({
    id,
    name: item.name,
    slug: item.slug,
    count: item.count
  })).sort((a, b) => b.count - a.count);

  // Format brand list
  const brandsList: FacetOption[] = Array.from(brandsMap.entries()).map(([id, item]) => ({
    id,
    name: item.name,
    slug: item.slug,
    count: item.count
  })).sort((a, b) => b.count - a.count);

  // Format attributes list
  const attributesList: AttributeFacet[] = Array.from(attributesMap.entries()).map(([groupCode, item]) => {
    const valuesList = Array.from(item.values.entries()).map(([code, valItem]) => ({
      value: valItem.value,
      code,
      count: valItem.count
    })).sort((a, b) => b.count - a.count);

    return {
      groupCode,
      groupName: item.groupName,
      values: valuesList
    };
  });

  return {
    categories: categoriesList,
    brands: brandsList,
    attributes: attributesList,
    priceRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice === -Infinity ? 0 : maxPrice
    }
  };
}

/**
 * Sort catalog items based on user preferences.
 */
function sortProducts(
  products: ProductSearchItem[], 
  sort: SearchQueryParams["sort"], 
  hasQuery: boolean
): ProductSearchItem[] {
  // If fuzzy searching, default "relevance" retains Fuse.js search score ranking
  if (hasQuery && sort === "relevance") {
    return products;
  }

  const sorted = [...products];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.priceMin - b.priceMin);
    case "price_desc":
      return sorted.sort((a, b) => b.priceMax - a.priceMax);
    case "newest":
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "relevance":
    default:
      // Default sorting: Featured first, then Best Sellers, then Newest
      return sorted.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        if (a.isBestSeller && !b.isBestSeller) return -1;
        if (!a.isBestSeller && b.isBestSeller) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
}
