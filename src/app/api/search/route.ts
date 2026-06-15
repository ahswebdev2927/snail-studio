import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/services/search/product-search.service";

/**
 * GET /api/search
 *
 * Query Parameters:
 * - q: Search query text
 * - category: Category slug or ID
 * - brand: Brand slug or ID
 * - shape: Comma-separated shapes (e.g. almond,coffin)
 * - length: Comma-separated lengths (e.g. short,medium)
 * - colour: Comma-separated colours (e.g. pink,nude)
 * - texture: Comma-separated textures (e.g. matte,glossy)
 * - minPrice: Minimum price in paise
 * - maxPrice: Maximum price in paise
 * - availability: "in_stock" | "out_of_stock"
 * - featured: "true" | "false"
 * - bestSeller: "true" | "false"
 * - sort: "relevance" | "price_asc" | "price_desc" | "newest"
 * - page: page number (default: 1)
 * - limit: page size (default: 24)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const brand = searchParams.get("brand") || undefined;

    // Parse comma-separated filter criteria
    const parseCommaSeparated = (paramName: string) => {
      const val = searchParams.get(paramName);
      if (!val) return undefined;
      return val.split(",").map((item) => item.trim()).filter(Boolean);
    };

    const shapes = parseCommaSeparated("shape");
    const lengths = parseCommaSeparated("length");
    const colours = parseCommaSeparated("colour");
    const textures = parseCommaSeparated("texture");

    const minPriceVal = searchParams.get("minPrice");
    const minPrice = minPriceVal ? parseInt(minPriceVal, 10) : undefined;

    const maxPriceVal = searchParams.get("maxPrice");
    const maxPrice = maxPriceVal ? parseInt(maxPriceVal, 10) : undefined;

    const availability = searchParams.get("availability") as "in_stock" | "out_of_stock" | null || undefined;

    const featuredVal = searchParams.get("featured");
    const featured = featuredVal === "true" ? true : featuredVal === "false" ? false : undefined;

    const bestSellerVal = searchParams.get("bestSeller");
    const bestSeller = bestSellerVal === "true" ? true : bestSellerVal === "false" ? false : undefined;

    const sort = (searchParams.get("sort") || "relevance") as "relevance" | "price_asc" | "price_desc" | "newest";

    const pageVal = searchParams.get("page");
    const page = pageVal ? Math.max(1, parseInt(pageVal, 10)) : 1;

    const limitVal = searchParams.get("limit");
    const limit = limitVal ? Math.max(1, parseInt(limitVal, 10)) : 24;

    // Call orchestrator
    const result = await searchProducts({
      q,
      category,
      brand,
      shapes,
      lengths,
      colours,
      textures,
      minPrice,
      maxPrice,
      availability,
      featured,
      bestSeller,
      sort,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      products: result.products,
      pagination: result.pagination,
      facets: result.facets,
      filters: {
        categories: result.facets.categories,
        brands: result.facets.brands,
        attributes: result.facets.attributes,
        priceRange: result.facets.priceRange
      }
    });
  } catch (error: any) {
    console.error("Search API Route Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error.message },
      { status: 500 }
    );
  }
}
