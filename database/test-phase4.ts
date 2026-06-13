import { NextRequest } from "next/server";
import { db } from "../src/db";
import { users, brands, categories } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../src/lib/auth/jwt";
import { nanoid } from "nanoid";

// Mock environment variables just in case
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "132395514b853d7da9b6e7aa0690be8e";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "f9a1f751008224f85622dc1673d24fad";

// Import Handlers
import { GET as getBrands, POST as createBrand } from "../src/app/api/brands/route";
import { GET as getBrand, PUT as updateBrand, DELETE as deleteBrand } from "../src/app/api/brands/[id]/route";
import { GET as getCategories, POST as createCategory } from "../src/app/api/categories/route";
import { PUT as updateCategory, DELETE as deleteCategory } from "../src/app/api/categories/[id]/route";

// Import Variant Utilities
import { generateVariants, generateUPCBarcode, validateUPCChecksum } from "../src/lib/catalog/variants";

interface CategoryItem {
  id: string;
  name: string;
  children: CategoryItem[];
}

async function runTests() {
  console.log("=== RUNNING PHASE 4 ENDPOINT TESTS ===");

  // 1. Fetch admin user for session signing
  const admin = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });

  if (!admin) {
    console.error("Admin user not found. Please run db:seed first.");
    process.exit(1);
  }

  // 2. Sign Admin access token
  const token = signAccessToken({
    sub: admin.id,
    firebaseUid: admin.firebaseUid,
    phone: admin.phoneNumber,
    role: admin.role,
    jti: `test_jti_${nanoid(10)}`,
  });

  // Pre-test cleanup to ensure idempotency
  await db.delete(brands).where(eq(brands.slug, "test-brand-nails"));
  await db.delete(categories).where(eq(categories.slug, "parent-test-category"));
  await db.delete(categories).where(eq(categories.slug, "child-test-category"));

  // --- BRAND TESTS ---
  console.log("\n--- Testing Brands ---");

  // Create Brand (Admin)
  const createBrandReq = new NextRequest("http://localhost:3000/api/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Brand Nails",
      description: "Elegant handcrafted press-on nails brand",
    }),
  });
  createBrandReq.cookies.set("accessToken", token);

  const createBrandRes = await createBrand(createBrandReq);
  const brandData = await createBrandRes.json();
  console.log("Create Brand status:", createBrandRes.status);
  console.log("Create Brand response:", brandData);
  if (createBrandRes.status !== 201) throw new Error("Brand creation failed");
  const testBrandId = brandData.id as string;

  // Get Brand Details
  const getBrandRes = await getBrand(
    new NextRequest(`http://localhost:3000/api/brands/${testBrandId}`),
    { params: Promise.resolve({ id: testBrandId }) }
  );
  console.log("Get Brand status:", getBrandRes.status);
  console.log("Get Brand response:", await getBrandRes.json());
  if (getBrandRes.status !== 200) throw new Error("Get Brand failed");

  // List Brands
  const listBrandsRes = await getBrands();
  console.log("List Brands status:", listBrandsRes.status);
  const brandsList = await listBrandsRes.json();
  console.log("List Brands count:", (brandsList as unknown[]).length);
  if (listBrandsRes.status !== 200) throw new Error("List Brands failed");

  // Update Brand (Admin)
  const updateBrandReq = new NextRequest(`http://localhost:3000/api/brands/${testBrandId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "Updated description for test brand",
    }),
  });
  updateBrandReq.cookies.set("accessToken", token);
  const updateBrandRes = await updateBrand(updateBrandReq, { params: Promise.resolve({ id: testBrandId }) });
  console.log("Update Brand status:", updateBrandRes.status);
  console.log("Update Brand response:", await updateBrandRes.json());
  if (updateBrandRes.status !== 200) throw new Error("Update Brand failed");


  // --- CATEGORY TESTS ---
  console.log("\n--- Testing Categories ---");

  // Create Parent Category
  const createCatReq = new NextRequest("http://localhost:3000/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Parent Test Category",
      description: "Top level testing category",
    }),
  });
  createCatReq.cookies.set("accessToken", token);
  const createCatRes = await createCategory(createCatReq);
  const catData = await createCatRes.json();
  console.log("Create Category status:", createCatRes.status);
  console.log("Create Category response:", catData);
  if (createCatRes.status !== 201) throw new Error("Category creation failed");
  const testCategoryId = catData.id as string;

  // Create Child Category
  const createChildCatReq = new NextRequest("http://localhost:3000/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Child Test Category",
      parentId: testCategoryId,
      description: "Sub level testing category",
    }),
  });
  createChildCatReq.cookies.set("accessToken", token);
  const createChildCatRes = await createCategory(createChildCatReq);
  const childCatData = await createChildCatRes.json();
  console.log("Create Child Category status:", createChildCatRes.status);
  console.log("Create Child Category response:", childCatData);
  if (createChildCatRes.status !== 201) throw new Error("Child Category creation failed");
  const testChildCategoryId = childCatData.id as string;

  // List Categories (Tree format)
  const getTreeReq = new NextRequest("http://localhost:3000/api/categories?tree=true");
  const getTreeRes = await getCategories(getTreeReq);
  console.log("List Categories (Tree) status:", getTreeRes.status);
  const treeData = (await getTreeRes.json()) as CategoryItem[];
  const parentInTree = treeData.find((c) => c.id === testCategoryId);
  console.log("Tree parent item:", parentInTree ? { id: parentInTree.id, name: parentInTree.name, childrenCount: parentInTree.children.length } : "Not found");
  if (getTreeRes.status !== 200 || !parentInTree || parentInTree.children.length !== 1) {
    throw new Error("Tree structure verification failed");
  }

  // Circular Dependency Test: Attempt to set Parent Category's parent to Child Category
  console.log("\n--- Testing Circular Dependency Prevention ---");
  const circularReq = new NextRequest(`http://localhost:3000/api/categories/${testCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parentId: testChildCategoryId,
    }),
  });
  circularReq.cookies.set("accessToken", token);
  const circularRes = await updateCategory(circularReq, { params: Promise.resolve({ id: testCategoryId }) });
  console.log("Circular Update status (Should be 400):", circularRes.status);
  const circularData = await circularRes.json();
  console.log("Circular Update response:", circularData);
  if (circularRes.status !== 400) {
    throw new Error("Circular dependency was not blocked!");
  }
  console.log("Success! Circular dependency was correctly blocked.");


  // --- VARIANT & BARCODE GENERATOR TESTS ---
  console.log("\n--- Testing Variant & Barcode Generators ---");
  
  // Test Barcode Generation & Validation
  const barcode = generateUPCBarcode();
  console.log("Generated UPC-A Barcode:", barcode);
  const isValid = validateUPCChecksum(barcode);
  console.log("Is barcode valid?", isValid);
  if (!isValid) throw new Error("Generated barcode failed checksum validation");

  // Verify invalid barcodes fail validation
  if (validateUPCChecksum("123456789011")) {
    throw new Error("Invalid barcode checksum was incorrectly verified as valid");
  }
  console.log("Successfully verified that incorrect checksums are blocked.");

  // Test Cartesian product and SKU/Name layout builders
  const testAttributes = {
    length: [
      { groupId: "g1", groupCode: "length", valueId: "v1", valueCode: "short" },
      { groupId: "g1", groupCode: "length", valueId: "v2", valueCode: "medium" },
    ],
    shape: [
      { groupId: "g2", groupCode: "shape", valueId: "v3", valueCode: "coffin" },
      { groupId: "g2", groupCode: "shape", valueId: "v4", valueCode: "almond" },
    ],
  };

  const variantsList = generateVariants("French Ombre Nails", "SNAIL-FRO", 149900, testAttributes);
  console.log("Generated variants count:", variantsList.length);
  variantsList.forEach((v) => {
    console.log(`- SKU: ${v.sku} | Name: ${v.name} | Price: ${v.price}`);
  });

  if (variantsList.length !== 4) throw new Error("Incorrect Cartesian variants count");
  if (variantsList[0].sku !== "SNAIL-FRO-S-COF") throw new Error(`Incorrect SKU generation: ${variantsList[0].sku}`);
  if (variantsList[0].name !== "French Ombre Nails - short / coffin") {
    throw new Error(`Incorrect name generation: ${variantsList[0].name}`);
  }
  console.log("Success! Cartesian variant generation and SKU/Name inheritance verified.");


  // --- CLEANUP ---
  console.log("\n--- Cleaning up Test Records ---");

  // Delete Categories
  const deleteChildReq = new NextRequest(`http://localhost:3000/api/categories/${testChildCategoryId}`, { method: "DELETE" });
  deleteChildReq.cookies.set("accessToken", token);
  const deleteChildRes = await deleteCategory(deleteChildReq, { params: Promise.resolve({ id: testChildCategoryId }) });
  console.log("Delete Child Category status:", deleteChildRes.status);

  const deleteParentReq = new NextRequest(`http://localhost:3000/api/categories/${testCategoryId}`, { method: "DELETE" });
  deleteParentReq.cookies.set("accessToken", token);
  const deleteParentRes = await deleteCategory(deleteParentReq, { params: Promise.resolve({ id: testCategoryId }) });
  console.log("Delete Parent Category status:", deleteParentRes.status);

  // Delete Brand
  const deleteBrandReq = new NextRequest(`http://localhost:3000/api/brands/${testBrandId}`, { method: "DELETE" });
  deleteBrandReq.cookies.set("accessToken", token);
  const deleteBrandRes = await deleteBrand(deleteBrandReq, { params: Promise.resolve({ id: testBrandId }) });
  console.log("Delete Brand status:", deleteBrandRes.status);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
