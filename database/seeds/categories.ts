import { db } from "../../src/db";
import { categories } from "../../src/db/schema";
import { nanoid } from "nanoid";

export async function seedCategories() {
  console.log("Seeding categories...");

  const categoryTree = [
    {
      name: "Press On Nails",
      slug: "press-on-nails",
      description: "Premium handcrafted press-on nail sets",
      subcategories: [
        { name: "Solid Colors", slug: "solid-colors", description: "Classic solid color nail designs" },
        { name: "French & Ombre", slug: "french-and-ombre", description: "Elegant gradients and French tips" },
        { name: "Nail Art", slug: "nail-art", description: "Intricate hand-painted nail art designs" },
        { name: "Glitter & Chrome", slug: "glitter-and-chrome", description: "Sparkling glitter and reflective chrome finishes" }
      ]
    },
    {
      name: "Care & Accessories",
      slug: "care-and-accessories",
      description: "Everything you need to apply and maintain your press-on nails",
      subcategories: [
        { name: "Adhesive Tabs", slug: "adhesive-tabs", description: "Temporary double-sided nail adhesives" },
        { name: "Nail Glue", slug: "nail-glue", description: "Long-wear professional nail glue" },
        { name: "Prep Kits", slug: "prep-kits", description: "Nail files, buffers, cuticle pushers, and prep pads" }
      ]
    }
  ];

  await db.transaction(async (tx) => {
    for (const parent of categoryTree) {
      let parentId = `cat_${nanoid(10)}`;
      const existingParent = await tx.query.categories.findFirst({
        where: (c, { eq }) => eq(c.slug, parent.slug)
      });

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        await tx.insert(categories).values({
          id: parentId,
          name: parent.name,
          slug: parent.slug,
          description: parent.description
        });
      }

      for (const sub of parent.subcategories) {
        const existingSub = await tx.query.categories.findFirst({
          where: (c, { eq }) => eq(c.slug, sub.slug)
        });

        if (!existingSub) {
          await tx.insert(categories).values({
            id: `cat_${nanoid(10)}`,
            parentId: parentId,
            name: sub.name,
            slug: sub.slug,
            description: sub.description
          });
        }
      }
    }
  });

  console.log("Categories seeded successfully!");
}
