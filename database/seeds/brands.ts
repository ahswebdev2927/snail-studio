import { db } from "../../src/db";
import { brands } from "../../src/db/schema";
import { eq } from "drizzle-orm";

export async function seedBrands() {
  console.log("Seeding brands...");
  const brandSlug = "snail-studio";

  await db.transaction(async (tx) => {
    const existing = await tx.query.brands.findFirst({
      where: eq(brands.slug, brandSlug),
    });

    if (!existing) {
      await tx.insert(brands).values({
        id: "brd_snail_studio",
        name: "Snail Studio",
        slug: brandSlug,
        description: "Handcrafted luxury press-on nail sets.",
        logoUrl: null, // As requested, leaving logos to the user
      });
      console.log("Brand Snail Studio seeded successfully!");
    } else {
      console.log("Brand Snail Studio already exists. Skipping.");
    }
  });
}
