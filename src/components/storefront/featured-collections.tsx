import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function FeaturedCollections() {
  // 1. Fetch parent "Press On Nails" category
  const parentCategory = await db.query.categories.findFirst({
    where: eq(categories.slug, "press-on-nails")
  });

  let collectionsList: typeof categories.$inferSelect[] = [];

  if (parentCategory) {
    // Fetch its subcategories
    collectionsList = await db.query.categories.findMany({
      where: eq(categories.parentId, parentCategory.id),
      orderBy: (c, { asc }) => [asc(c.name)]
    });
  } else {
    // Fallback: fetch parent categories (which have null parentId)
    collectionsList = await db.query.categories.findMany({
      where: isNull(categories.parentId),
      orderBy: (c, { asc }) => [asc(c.name)]
    });
  }

  // If there are still no categories, return nothing to avoid blank section
  if (collectionsList.length === 0) return null;

  return (
    <section className="py-20 bg-background border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-semibold">
            Curated Styles
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
            Featured Collections
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-md mx-auto">
            Discover our designer series of premium, handcrafted press-on sets tailored to match every mood and occasion.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collectionsList.map((collection) => {
            const imageUrl = collection.image || "/luxury_nails_hero.png";
            return (
              <Link
                key={collection.id}
                href={`/shop?category=${collection.slug}`}
                className="group relative block aspect-[4/5] rounded-3xl overflow-hidden border border-border/10 bg-card shadow-xs hover:shadow-lg transition-all duration-500"
              >
                {/* Background Image */}
                <Image
                  src={imageUrl}
                  alt={collection.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Translucent Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

                {/* Card Content (Bottom-aligned) */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end space-y-2 z-10">
                  <h3 className="font-serif text-xl font-normal text-white tracking-wide">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-xs text-white/80 font-light line-clamp-2 leading-relaxed">
                      {collection.description}
                    </p>
                  )}
                  
                  {/* Shop CTA indicator */}
                  <div className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-accent pt-1 group-hover:text-accent-hover transition-colors">
                    Shop Collection
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export default FeaturedCollections;
