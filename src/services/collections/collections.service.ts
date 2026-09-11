import { db } from "@/db";
import { collections, products, productCollections } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Evaluates whether a product matches a specific collection rule.
 */
/**
 * Evaluates whether a product matches a specific collection rule.
 */
function evaluateRule(product: any, rule: any): boolean {
  const column = rule.column;
  const relation = rule.relation;
  const value = rule.value;

  switch (column) {
    case "categoryId": {
      if (relation === "equals") return product.categoryId === value;
      if (relation === "not_equals") return product.categoryId !== value;
      return false;
    }
    case "brandId": {
      if (relation === "equals") return product.brandId === value;
      if (relation === "not_equals") return product.brandId !== value;
      return false;
    }
    case "name": {
      const prodName = (product.name || "").toLowerCase();
      const ruleVal = (value || "").toLowerCase();
      if (relation === "equals") return prodName === ruleVal;
      if (relation === "contains") return prodName.includes(ruleVal);
      if (relation === "starts_with") return prodName.startsWith(ruleVal);
      if (relation === "ends_with") return prodName.endsWith(ruleVal);
      return false;
    }
    case "price":
    case "price_min":
    case "priceMin": {
      // product.priceMin is stored in paise (e.g. 450000 = ₹4,500)
      const prodPriceRupees = (product.priceMin || 0) / 100;
      let rulePrice = parseFloat(value);
      if (isNaN(rulePrice)) return false;

      // Normalize if rule value was entered in paise (>= 100000)
      if (rulePrice >= 100000) {
        rulePrice = rulePrice / 100;
      }

      if (relation === "equals") return prodPriceRupees === rulePrice;
      if (relation === "greater_than") return prodPriceRupees > rulePrice;
      if (relation === "greater_than_or_equal") return prodPriceRupees >= rulePrice;
      if (relation === "less_than") return prodPriceRupees < rulePrice;
      if (relation === "less_than_or_equal") return prodPriceRupees <= rulePrice;
      return false;
    }
    case "price_max":
    case "priceMax": {
      const prodPriceRupees = (product.priceMax || product.priceMin || 0) / 100;
      let rulePrice = parseFloat(value);
      if (isNaN(rulePrice)) return false;

      if (rulePrice >= 100000) {
        rulePrice = rulePrice / 100;
      }

      if (relation === "equals") return prodPriceRupees === rulePrice;
      if (relation === "greater_than") return prodPriceRupees > rulePrice;
      if (relation === "greater_than_or_equal") return prodPriceRupees >= rulePrice;
      if (relation === "less_than") return prodPriceRupees < rulePrice;
      if (relation === "less_than_or_equal") return prodPriceRupees <= rulePrice;
      return false;
    }
    case "price_between":
    case "priceBetween": {
      const prodPriceRupees = (product.priceMin || 0) / 100;
      const parts = (value || "").split(/[-,\s]+/);
      let minVal = parseFloat(parts[0]);
      let maxVal = parseFloat(parts[1]);
      if (isNaN(minVal) || isNaN(maxVal)) return false;

      if (minVal >= 100000) minVal /= 100;
      if (maxVal >= 100000) maxVal /= 100;

      return prodPriceRupees >= minVal && prodPriceRupees <= maxVal;
    }
    default: {
      // Treat as an attribute group code filter (e.g. shape, length, colour, texture)
      // Find if any attribute matches
      const hasAttr = product.attributeValues?.some((pav: any) => {
        const attrVal = pav.attributeValue;
        if (!attrVal || !attrVal.group) return false;
        
        const groupCode = (attrVal.group.code || "").toLowerCase();
        const ruleCol = (column || "").toLowerCase();
        if (groupCode !== ruleCol) return false;

        const valCode = (attrVal.code || "").toLowerCase();
        const valText = (attrVal.value || "").toLowerCase();
        const ruleVal = (value || "").toLowerCase();

        if (relation === "equals") return valCode === ruleVal || valText === ruleVal;
        if (relation === "contains") return valCode.includes(ruleVal) || valText.includes(ruleVal);
        if (relation === "not_equals") return valCode !== ruleVal && valText !== ruleVal;
        return false;
      });

      if (relation === "not_equals") {
        return !hasAttr;
      }
      return !!hasAttr;
    }
  }
}

/**
 * Compiles a dynamic collection by evaluating its rules against all products
 * and updating the product-to-collection mapping in the database.
 * 
 * Runs in a database transaction to ensure atomicity.
 * 
 * @param collectionId The ID of the dynamic collection to compile.
 * @param tx Optional transaction client.
 */
export async function compileDynamicCollection(collectionId: string, tx?: any): Promise<void> {
  const client = tx || db;

  // 1. Fetch target collection with rules
  const collection = await client.query.collections.findFirst({
    where: eq(collections.id, collectionId),
    with: {
      rules: true,
    },
  });

  if (!collection || collection.type !== "dynamic") {
    return;
  }

  // 2. Fetch all products with attributes
  const allProducts = await client.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      attributeValues: {
        with: {
          attributeValue: {
            with: {
              group: true,
            },
          },
        },
      },
    },
  });

  // 3. Filter products that match all rules
  const matchedProductIds: string[] = [];
  const rules = collection.rules || [];

  for (const product of allProducts) {
    let matchesAll = true;

    for (const rule of rules) {
      if (!evaluateRule(product, rule)) {
        matchesAll = false;
        break;
      }
    }

    // A collection with no rules should match no products by default
    if (rules.length > 0 && matchesAll) {
      matchedProductIds.push(product.id);
    }
  }

  // 4. Update the database mappings in a transaction
  const performUpdate = async (transactionClient: any) => {
    // Delete existing mappings for this collection
    await transactionClient
      .delete(productCollections)
      .where(eq(productCollections.collectionId, collectionId));

    // Insert new mappings if any products matched
    if (matchedProductIds.length > 0) {
      const valuesToInsert = matchedProductIds.map((productId) => ({
        productId,
        collectionId,
      }));
      await transactionClient.insert(productCollections).values(valuesToInsert);
    }
  };

  if (tx) {
    await performUpdate(tx);
  } else {
    await db.transaction(async (innerTx) => {
      await performUpdate(innerTx);
    });
  }
}

/**
 * Re-evaluates and recompiles all active dynamic collections.
 */
export async function recompileAllDynamicCollections(tx?: any): Promise<void> {
  const client = tx || db;
  const dynamicCols = await client.query.collections.findMany({
    where: eq(collections.type, "dynamic"),
  });

  for (const col of dynamicCols) {
    await compileDynamicCollection(col.id, client);
  }
}
