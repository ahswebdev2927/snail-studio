import { and, eq, exists, inArray, gte, lte, or, sql, like, gt, not } from "drizzle-orm";
import { db } from "@/db";
import { 
  products, 
  productAttributeValues, 
  attributeValues, 
  attributeGroups,
  brands,
  categories,
  productVariants,
  inventoryItems
} from "@/db/schema";
import { ProductSearchItem } from "./fuse-search.service";

export interface FilterParams {
  q?: string;            // Text search query for database-first matching
  category?: string;     // Slug or ID
  brand?: string;        // Slug or ID
  shapes?: string[];     // Array of attribute value codes (e.g. ['almond', 'coffin'])
  lengths?: string[];    // Array of attribute value codes (e.g. ['short', 'medium'])
  colours?: string[];    // Array of attribute value codes (e.g. ['pink', 'nude'])
  textures?: string[];   // Array of attribute value codes (e.g. ['matte', 'glossy'])
  minPrice?: number;     // in Paise
  maxPrice?: number;     // in Paise
  availability?: "in_stock" | "out_of_stock"; // Inventory availability status
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
    isActive = true
  } = params;

  const conditions = [];

  // 1. Enforce active products (customer view)
  if (isActive !== undefined) {
    conditions.push(eq(products.isActive, isActive));
  }

  // 2. Database Text Search Query Pre-filter (Step 6.3)
  if (q && q.trim()) {
    const searchTerm = `%${q.trim()}%`;
    conditions.push(
      or(
        like(products.name, searchTerm),
        like(products.slug, searchTerm),
        like(products.description, searchTerm),
        like(products.shortDescription, searchTerm),
        exists(
          db.select()
            .from(brands)
            .where(
              and(
                eq(brands.id, products.brandId),
                like(brands.name, searchTerm)
              )
            )
        ),
        exists(
          db.select()
            .from(categories)
            .where(
              and(
                eq(categories.id, products.categoryId),
                like(categories.name, searchTerm)
              )
            )
        )
      )
    );
  }

  // 3. Category Filter (with Subcategory Inheritance)
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

  // 4. Brand Filter
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

  // 5. Price range filters (Overlaps min/max price boundaries of product)
  if (minPrice !== undefined) {
    conditions.push(gte(products.priceMax, minPrice));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(products.priceMin, maxPrice));
  }

  // 6. Availability Filter (Step 6.4)
  if (availability) {
    const inStockCondition = exists(
      db.select()
        .from(productVariants)
        .innerJoin(inventoryItems, eq(productVariants.id, inventoryItems.variantId))
        .where(
          and(
            eq(productVariants.productId, products.id),
            gt(inventoryItems.stockLevel, 0)
          )
        )
    );

    if (availability === "in_stock") {
      conditions.push(inStockCondition);
    } else if (availability === "out_of_stock") {
      conditions.push(not(inStockCondition));
    }
  }

  // 7. Featured / Best Seller Flags
  if (featured !== undefined) {
    conditions.push(eq(products.isFeatured, featured));
  }
  if (bestSeller !== undefined) {
    conditions.push(eq(products.isBestSeller, bestSeller));
  }

  // 8. Attribute Filters (Exists subqueries for Shape, Length, Colour, Texture)
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

  // 9. Execute Drizzle Query with relations
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

  // 10. Transform relational database records to ProductSearchItem format
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
