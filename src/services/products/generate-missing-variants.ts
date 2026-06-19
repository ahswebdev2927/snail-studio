import { db } from "@/db";
import { 
  products, 
  productVariants, 
  variantAttributeValues, 
  inventoryItems, 
  inventoryTransactions,
  attributeValues, 
  attributeGroups 
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateUPCBarcode, getSkuCode } from "@/lib/catalog/variants";

interface GenerateParams {
  productId: string;
  selectedAttributeValueIds: string[];
  userId?: string; // Optional user ID for inventory audit logging
}

/**
 * Service to generate only the missing variants for a product.
 * Handles loading existing variants, computing Cartesian combinations,
 * identifying the missing variants, and creating them with default inventory.
 */
export async function generateMissingVariants(
  params: GenerateParams,
  tx?: any
) {
  const client = tx || db;
  const { productId, selectedAttributeValueIds, userId } = params;

  if (selectedAttributeValueIds.length === 0) {
    return { success: true, createdCount: 0, variants: [] };
  }

  // 1. Fetch product & its existing variants
  const product = await client.query.products.findFirst({
    where: eq(products.id, productId),
    with: {
      variants: {
        with: {
          attributes: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found with ID: ${productId}`);
  }

  // 2. Fetch selected attribute value details to group them
  const selectedValues = await client.query.attributeValues.findMany({
    where: inArray(attributeValues.id, selectedAttributeValueIds),
    with: {
      group: true,
    },
  });

  if (selectedValues.length === 0) {
    return { success: true, createdCount: 0, variants: [] };
  }

  // Group attribute values by groupId
  const groupedAttributes: Record<string, any[]> = {};
  selectedValues.forEach((val: any) => {
    if (!groupedAttributes[val.groupId]) {
      groupedAttributes[val.groupId] = [];
    }
    groupedAttributes[val.groupId].push(val);
  });

  const groupIds = Object.keys(groupedAttributes);
  if (groupIds.length === 0) {
    return { success: true, createdCount: 0, variants: [] };
  }

  // Generate Cartesian product combinations
  // Combination helper: takes array of arrays and returns Cartesian product
  const cartesianHelper = (arrays: any[][]): any[][] => {
    return arrays.reduce<any[][]>(
      (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
      [[]]
    );
  };

  const attributeValueLists = groupIds.map((gid: string) => groupedAttributes[gid]);
  const combinations = cartesianHelper(attributeValueLists);

  // 3. Compare combinations with existing variants
  // Create a fingerprint/set of existing variant attribute combination IDs
  const existingFingerprints = new Set<string>();
  product.variants.forEach((v: any) => {
    const valIds = v.attributes.map((a: any) => a.attributeValueId).sort().join(",");
    existingFingerprints.add(valIds);
  });

  // Determine missing combinations
  const missingCombinations = combinations.filter((comb: any[]) => {
    const combValIds = comb.map((v: any) => v.id).sort().join(",");
    return !existingFingerprints.has(combValIds);
  });

  if (missingCombinations.length === 0) {
    return { success: true, createdCount: 0, variants: [] };
  }

  // 4. Auto-generate base SKU if not obvious
  // Derive base SKU from existing variants if available, otherwise slug-based
  let baseSku = `SNAIL-${product.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)}`;
  if (product.variants.length > 0) {
    // Take the first variant's SKU, split by '-' and try to reconstruct base SKU
    const sampleSku = product.variants[0].sku;
    const parts = sampleSku.split("-");
    if (parts.length > 1) {
      // Find where attributes start. Standard variant SKU: BASE-SKU-LEN-SHAPE
      // Attributes are usually short suffix codes like S, M, COF, ALM.
      // We take the first 2 parts as base SKU if parts length is 3 or 4, or guess.
      // A safe way is to take everything except the last N parts where N is the number of attribute groups.
      // Let's check how many attribute groups there were in the existing variant:
      const existingAttrCount = product.variants[0].attributes.length;
      if (parts.length > existingAttrCount) {
        baseSku = parts.slice(0, parts.length - existingAttrCount).join("-");
      }
    }
  }

  const now = new Date();
  const createdVariants: any[] = [];

  // 5. Insert missing variants in transaction
  const execute = async (txClient: any) => {
    for (const comb of missingCombinations) {
      const variantId = `var_${nanoid(10)}`;

      // Sort combinations by groupCode alphabetically for SKU suffix consistency (as in generateVariants)
      const sortedComb = [...comb].sort((a: any, b: any) => a.group.code.localeCompare(b.group.code));

      // Build SKU and Name
      const suffixSku = sortedComb
        .map((c: any) => getSkuCode(c.group.code, c.code))
        .join("-");
      const variantSku = `${baseSku}-${suffixSku}`;

      const variantNameSuffix = sortedComb.map((c: any) => c.value).join(" / ");
      const variantName = `${product.name} - ${variantNameSuffix}`;

      // Insert product variant
      await txClient.insert(productVariants).values({
        id: variantId,
        productId: product.id,
        sku: variantSku,
        name: variantName,
        price: product.priceMin, // Default values: Price = Product Base Price (priceMin)
        compareAtPrice: null,
        barcode: generateUPCBarcode(), // Default: Auto-generate barcode
        status: "Active", // Default values: Status = Active
        createdAt: now,
        updatedAt: now,
      });

      // Link variant attributes
      const linkValues = sortedComb.map((c) => ({
        variantId,
        attributeValueId: c.id,
      }));
      await txClient.insert(variantAttributeValues).values(linkValues);

      // Insert default inventory item: Stock = 0, threshold = 5
      const inventoryId = `inv_${nanoid(10)}`;
      await txClient.insert(inventoryItems).values({
        id: inventoryId,
        variantId,
        stockLevel: 0, // Default values: Stock = 0
        lowStockThreshold: 5,
        createdAt: now,
        updatedAt: now,
      });

      // Log initial inventory transaction: difference = 0
      await txClient.insert(inventoryTransactions).values({
        id: `it_${nanoid(12)}`,
        inventoryItemId: inventoryId,
        type: "adjustment",
        quantity: 0,
        reference: `Initial stock generation. Previous: 0, New: 0, Diff: 0${userId ? `, Admin: ${userId}` : ""}`,
        createdAt: now,
      });

      createdVariants.push({
        id: variantId,
        sku: variantSku,
        name: variantName,
        price: product.priceMin,
        stock: 0,
      });
    }

    // Refresh price range (priceMin/priceMax) on product if necessary (though they all have base price here)
    return createdVariants;
  };

  if (tx) {
    const result = await execute(tx);
    return { success: true, createdCount: result.length, variants: result };
  } else {
    return db.transaction(async (innerTx) => {
      const result = await execute(innerTx);
      return { success: true, createdCount: result.length, variants: result };
    });
  }
}
