export interface AttributeOption {
  groupId: string;
  groupCode: string; // e.g. "length"
  valueId: string;
  valueCode: string; // e.g. "short"
}

/**
 * Maps attribute values to standard uppercase SKU codes.
 * - Length: short -> S, medium -> M, long -> L, extra_long/extra-long -> XL.
 * - Other attributes: default to first 3 letters capitalized.
 */
export function getSkuCode(groupCode: string, valueCode: string): string {
  const g = groupCode.toLowerCase();
  const v = valueCode.toLowerCase();

  if (g === "length") {
    if (v === "short") return "S";
    if (v === "medium") return "M";
    if (v === "long") return "L";
    if (v === "extra_long" || v === "extra-long") return "XL";
  }

  // Default fallback: take the first 3 letters capitalized
  return v.slice(0, 3).replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

/**
 * Generates a valid 12-digit UPC-A barcode with a correct modulo-10 checksum digit.
 */
export function generateUPCBarcode(): string {
  // Generate 11 random digits
  let digits = "";
  for (let i = 0; i < 11; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }

  // Modulo-10 checksum calculation
  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      // 0-indexed positions 0, 2, 4, 6, 8, 10 are odd positions (1st, 3rd, 5th, etc.)
      oddSum += digit;
    } else {
      // 0-indexed positions 1, 3, 5, 7, 9 are even positions (2nd, 4th, etc.)
      evenSum += digit;
    }
  }

  const total = oddSum * 3 + evenSum;
  const mod = total % 10;
  const checkDigit = mod === 0 ? 0 : 10 - mod;

  return digits + checkDigit.toString();
}

/**
 * Validates a 12-digit UPC-A barcode checksum.
 */
export function validateUPCChecksum(barcode: string): boolean {
  if (barcode.length !== 12 || !/^\d+$/.test(barcode)) {
    return false;
  }

  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode[i], 10);
    if (i % 2 === 0) {
      oddSum += digit;
    } else {
      evenSum += digit;
    }
  }

  const total = oddSum * 3 + evenSum;
  const mod = total % 10;
  const expectedCheckDigit = mod === 0 ? 0 : 10 - mod;

  return parseInt(barcode[11], 10) === expectedCheckDigit;
}

/**
 * Computes the Cartesian product of selected attribute value arrays.
 */
function cartesian(arrays: AttributeOption[][]): AttributeOption[][] {
  return arrays.reduce<AttributeOption[][]>(
    (acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])),
    [[]]
  );
}

/**
 * Generates all product variant combinations based on selected base attributes.
 */
export function generateVariants(
  parentProductName: string,
  baseSku: string,
  basePrice: number,
  attributesSelected: Record<string, AttributeOption[]>
): Array<{
  sku: string;
  name: string;
  price: number;
  attributeValues: AttributeOption[];
}> {
  const keys = Object.keys(attributesSelected);
  if (keys.length === 0) return [];

  // Get Cartesian combination list
  const attributeCombinations = cartesian(keys.map((k) => attributesSelected[k]));

  return attributeCombinations.map((comb) => {
    // Sort combinations by groupCode alphabetically for SKU suffix consistency
    const sortedComb = [...comb].sort((a, b) => a.groupCode.localeCompare(b.groupCode));

    // Map each value to its abbreviated SKU component code
    const suffixSku = sortedComb
      .map((c) => getSkuCode(c.groupCode, c.valueCode))
      .join("-");

    const variantSku = `${baseSku}-${suffixSku}`;
    
    // Variant name layout: e.g. "French Ombre - Short / Coffin"
    const variantNameSuffix = sortedComb.map((c) => c.valueCode).join(" / ");
    const variantName = `${parentProductName} - ${variantNameSuffix}`;

    return {
      sku: variantSku,
      name: variantName,
      price: basePrice, // Inherits base product price by default
      attributeValues: sortedComb,
    };
  });
}
