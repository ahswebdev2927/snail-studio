import { db } from "../../src/db";
import { collections } from "../../src/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function seedCollections() {
  console.log("Seeding collections...");

  const defaultCollections = [
    {
      name: "Short Nails",
      slug: "short-nails",
      description: "Chic, practical, and everyday-ready short press-on sets.",
      type: "manual" as const,
      isActive: true,
    },
    {
      name: "Long Nails",
      slug: "long-nails",
      description: "Glamorous and statement-making long press-on sets.",
      type: "manual" as const,
      isActive: true,
    },
    {
      name: "Wedding Nails",
      slug: "wedding-nails",
      description: "Elegant, pearlescent, and detailed bridal nail sets for your special day.",
      type: "manual" as const,
      isActive: true,
    },
    {
      name: "French Tips",
      slug: "french-tips",
      description: "Classic French manicures reinvented with modern, luxury designs.",
      type: "manual" as const,
      isActive: true,
    },
    {
      name: "Summer Collection",
      slug: "summer-collection",
      description: "Vibrant, neon, and sun-kissed styles for the perfect summer vibe.",
      type: "manual" as const,
      isActive: true,
    },
    {
      name: "Blush Quartz Collection",
      slug: "blush-quartz-collection",
      description: "Our bestseller soft pink quartz marble set designed for luxury vibes.",
      type: "manual" as const,
      isActive: true,
    },
  ];

  await db.transaction(async (tx) => {
    for (const item of defaultCollections) {
      const existing = await tx.query.collections.findFirst({
        where: eq(collections.slug, item.slug),
      });

      if (existing) {
        await tx
          .update(collections)
          .set({
            name: item.name,
            description: item.description,
            type: item.type,
            isActive: item.isActive,
            updatedAt: new Date(),
          })
          .where(eq(collections.id, existing.id));
      } else {
        await tx.insert(collections).values({
          id: `col_${nanoid(10)}`,
          name: item.name,
          slug: item.slug,
          description: item.description,
          type: item.type,
          isActive: item.isActive,
        });
      }
    }
  });

  console.log("Collections seeded successfully!");
}
