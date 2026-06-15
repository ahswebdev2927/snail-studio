import { and, eq, exists, inArray, gte, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { 
  products, 
  productAttributeValues, 
  attributeValues, 
  attributeGroups,
  brands,
  categories
} from "@/db/schema";
import { ProductSearchItem } from "./fuse-search.service";

export interface FilterParams {
  category?: string;     // Slug or ID
  brand?: string;        // Slug or ID
  shapes?: string[];     // Array of attribute value codes (e.g. ['almond', 'coffin'])
  lengths?: string[];    // Array of attribute value codes (e.g. ['short', 'medium'])
  colours?: string[];    // Array of attribute value codes (e.g. ['pink', 'nude'])
  textures?: string[];   // Array of attribute value codes (e.g. ['matte', 'glossy'])
  minPrice?: number;     // in Paise
  maxPrice?: number;     // in Paise
  featured?: boolean;
  bestSeller?: boolean;
  isActive?: boolean;    // Defaults to true for customer-facing search
}

/**
 * Service to query and filter products from the database.
 * Executes database-level filtering before fuzzy ranking or sorting.
 */
export async function getFilteredProducts(params: FilterParams): Promise<ProductSearchItem[]> {
  const {
    category,
    brand,
    shapes,
    lengths,
    colours,
    textures,
    minPrice,
    maxPrice,
    featured,
    bestSeller,
    isActive = true
  } = params;

  const conditions = [];

  // 1. Enforce active products (customer view)
  if (isActive !== undefined) {
    conditions.push(eq(products.isActive, isActive));
  }

  // 2. Category Filter (with Subcategory Inheritance)
  if (category) {
    const targetCategory = await db.query.categories.findFirst({
      where: or(eq(categories.id, category), eq(categories.slug, category))
    });

    if (targetCategory) {
      const categoryIds = [targetCategory.id];
      // Fetch immediate subcategories
      const subCats = await db.query.categories.findMany({
        where: eq(categories.parentId, targetCategory.id)
      });
      categoryIds.push(...subCats.map(c => c.id));
      
      conditions.push(inArray(products.categoryId, categoryIds));
    } else {
      // If a category was supplied but not found, return empty results
      return [];
    }
  }

  // 3. Brand Filter
  if (brand) {
    const targetBrand = await db.query.brands.findFirst({
      where: or(eq(brands.id, brand), eq(brands.slug, brand))
    });

    if (targetBrand) {
      conditions.push(eq(products.brandId, targetBrand.id));
    } else {
      // If a brand was supplied but not found, return empty results
      return [];
    }
  }

  // 4. Price range filters (Overlaps min/max price boundaries of product)
  if (minPrice !== undefined) {
    conditions.push(gte(products.priceMax, minPrice));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(products.priceMin, maxPrice));
  }

  // 5. Featured / Best Seller Flags
  if (featured !== undefined) {
    conditions.push(eq(products.isFeatured, featured));
  }
  if (bestSeller !== undefined) {
    conditions.push(eq(products.isBestSeller, bestSeller));
  }

  // 6. Attribute Filters (Exists subqueries for Shape, Length, Colour, Texture)
  const buildAttributeFilter = (groupCode: string, valueCodes: string[]) => {
    return exists(
      db.select()
        .from(productAttributeValues)
        .innerJoin(attributeValues, eq(productAttributeValues.attributeValueId, attributeValues.id))
        .innerJoin(attributeGroups, eq(attributeValues.groupId, attributeGroups.id))
        .where(
          and(
            eq(productAttributeValues.productId, products.id),
            eq(attributeGroups.code, groupCode),
            inArray(attributeValues.code, valueCodes)
          )
        )
    );
  };

  if (shapes && shapes.length > 0) {
    conditions.push(buildAttributeFilter("shape", shapes));
  }
  if (lengths && lengths.length > 0) {
    conditions.push(buildAttributeFilter("length", lengths));
  }
  if (colours && colours.length > 0) {
    conditions.push(buildAttributeFilter("colour", colours));
  }
  if (textures && textures.length > 0) {
    conditions.push(buildAttributeFilter("texture", textures));
  }

  // 7. Execute Drizzle Query with relations
  const rawProducts = await db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      brand: true,
      category: true,
      attributeValues: {
        with: {
          attributeValue: {
            with: {
              group: true
            }
          }
        }
      }
    }
  });

  // 8. Transform relational database records to ProductSearchItem format
  return rawProducts.map((p) => {
    const attributeList = p.attributeValues.map((pav) => {
      const val = pav.attributeValue;
      return {
        groupCode: val.group.code,
        groupName: val.group.name,
        value: val.value,
        valueCode: val.code,
      };
    });

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      shortDescription: p.shortDescription,
      priceMin: p.priceMin,
      priceMax: p.priceMax,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      brandId: p.brandId,
      brandName: p.brand ? p.brand.name : null,
      brandSlug: p.brand ? p.brand.slug : null,
      categoryId: p.categoryId,
      categoryName: p.category ? p.category.name : null,
      categorySlug: p.category ? p.category.slug : null,
      attributes: attributeList,
      createdAt: p.createdAt,
    };
  });
}
