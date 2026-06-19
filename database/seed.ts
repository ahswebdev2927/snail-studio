import { seedAdminUser } from "./seeds/admin-user";
import { seedAttributes } from "./seeds/attributes";
import { seedCategories } from "./seeds/categories";
import { seedProducts } from "./seeds/products";

async function main() {
  console.log("Starting database seeding...");
  try {
    await seedAdminUser();
    await seedAttributes();
    await seedCategories();
    await seedProducts();
    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

main();

