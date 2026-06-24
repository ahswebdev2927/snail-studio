import { NextRequest, NextResponse } from "next/server";
import { and, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, attributeValues, attributeGroups, products } from "@/db/schema";

interface AutocompleteSuggestion {
  type: "query" | "category" | "attribute" | "product";
  text: string;
  url: string;
  slug?: string;
  value?: string;
  group?: string;
}

/**
 * GET /api/search/suggestions?q=...
 * Returns autocomplete suggestions including categories, attributes, and product names.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    const searchTerm = `%${q}%`;

    // 1. Fetch matching categories in parallel
    const catQuery = db
      .select({
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(or(
        like(categories.name, searchTerm),
        like(categories.slug, searchTerm)
      ))
      .limit(3);

    // 2. Fetch matching attributes (e.g. Shape: Coffin, Color: Pink) in parallel
    const attrQuery = db
      .select({
        value: attributeValues.value,
        code: attributeValues.code,
        groupCode: attributeGroups.code,
        groupName: attributeGroups.name,
      })
      .from(attributeValues)
      .innerJoin(attributeGroups, eq(attributeValues.groupId, attributeGroups.id))
      .where(or(
        like(attributeValues.value, searchTerm),
        like(attributeValues.code, searchTerm)
      ))
      .limit(5);

    // 3. Fetch matching products in parallel
    const prodQuery = db
      .select({
        name: products.name,
        slug: products.slug,
      })
      .from(products)
      .where(and(
        eq(products.isActive, true),
        or(
          like(products.name, searchTerm),
          like(products.slug, searchTerm)
        )
      ))
      .limit(5);

    // Run queries concurrently
    const [cats, attrs, prods] = await Promise.all([catQuery, attrQuery, prodQuery]);

    // Format matches into structured autocomplete objects
    const suggestions: AutocompleteSuggestion[] = [];

    // Add generic text query search option first
    suggestions.push({
      type: "query",
      text: q,
      url: `/shop?q=${encodeURIComponent(q)}`,
    });

    // Format Categories
    cats.forEach((cat) => {
      suggestions.push({
        type: "category",
        text: `${cat.name} Collection`,
        slug: cat.slug,
        url: `/shop?category=${cat.slug}`,
      });
    });

    // Format Attributes
    attrs.forEach((attr) => {
      suggestions.push({
        type: "attribute",
        text: `${attr.groupName}: ${attr.value}`,
        value: attr.code,
        group: attr.groupCode,
        url: `/shop?${attr.groupCode}=${attr.code}`,
      });
    });

    // Format Products
    prods.forEach((prod) => {
      suggestions.push({
        type: "product",
        text: prod.name,
        slug: prod.slug,
        url: `/products/${prod.slug}`,
      });
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: unknown) {
    console.error("Failed to generate autocomplete suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate suggestions", details: errorMessage },
      { status: 500 }
    );
  }
}
