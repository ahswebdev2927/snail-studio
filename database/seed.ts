import { seedAdminUser } from "./seeds/admin-user";
import { seedBrands } from "./seeds/brands";
import { seedAttributes } from "./seeds/attributes";
import { seedCategories } from "./seeds/categories";
import { seedProducts } from "./seeds/products";
import { seedCollections } from "./seeds/collections";
import { seedPresentationData } from "./seeds/presentation-data";

async function main() {
  console.log("Starting database seeding...");
  try {
    await seedAdminUser();
    await seedBrands();
    await seedAttributes();
    await seedCategories();
    await seedProducts();
    await seedCollections();
    await seedPresentationData();
    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

main();


