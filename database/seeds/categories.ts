import { db } from "../../src/db";
import { categories } from "../../src/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function seedCategories() {
  console.log("Seeding categories...");

  const categoryTree = [
    {
      name: "Press On Nails",
      slug: "press-on-nails",
      description: "Premium handcrafted press-on nail sets",
      image: "/luxury_nails_hero.png",
      subcategories: [
        { name: "Solid Colors", slug: "solid-colors", description: "Classic solid color nail designs", image: "/luxury_nails_hero.png" },
        { name: "French & Ombre", slug: "french-and-ombre", description: "Elegant gradients and French tips", image: "/luxury_nails_hero.png" },
        { name: "Nail Art", slug: "nail-art", description: "Intricate hand-painted nail art designs", image: "/emerald_nails_set.png" },
        { name: "Glitter & Chrome", slug: "glitter-and-chrome", description: "Sparkling glitter and reflective chrome finishes", image: "/emerald_nails_set.png" }
      ]
    },
    {
      name: "Care & Accessories",
      slug: "care-and-accessories",
      description: "Everything you need to apply and maintain your press-on nails",
      image: "/luxury_nails_hero.png",
      subcategories: [
        { name: "Adhesive Tabs", slug: "adhesive-tabs", description: "Temporary double-sided nail adhesives", image: "/luxury_nails_hero.png" },
        { name: "Nail Glue", slug: "nail-glue", description: "Long-wear professional nail glue", image: "/luxury_nails_hero.png" },
        { name: "Prep Kits", slug: "prep-kits", description: "Nail files, buffers, cuticle pushers, and prep pads", image: "/luxury_nails_hero.png" }
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
        await tx.update(categories).set({
          description: parent.description,
          image: parent.image || null,
          updatedAt: new Date()
        }).where(eq(categories.id, parentId));
      } else {
        await tx.insert(categories).values({
          id: parentId,
          name: parent.name,
          slug: parent.slug,
          description: parent.description,
          image: parent.image || null
        });
      }

      for (const sub of parent.subcategories) {
        const existingSub = await tx.query.categories.findFirst({
          where: (c, { eq }) => eq(c.slug, sub.slug)
        });

        if (existingSub) {
          await tx.update(categories).set({
            description: sub.description,
            image: sub.image || null,
            updatedAt: new Date()
          }).where(eq(categories.id, existingSub.id));
        } else {
          await tx.insert(categories).values({
            id: `cat_${nanoid(10)}`,
            parentId: parentId,
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            image: sub.image || null
          });
        }
      }
    }
  });

  console.log("Categories seeded successfully!");
}
