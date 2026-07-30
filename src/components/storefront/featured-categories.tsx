import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function FeaturedCategories() {
  // Query categories flagged to show on the homepage
  const categoriesList = await db.query.categories.findMany({
    where: eq(categories.showOnHomepage, true),
    orderBy: asc(categories.sortOrder)
  });

  // If there are no configured categories, hide the section to avoid a blank layout
  if (categoriesList.length === 0) return null;

  return (
    <section className="py-16 bg-background border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-semibold">
            Curated Styles
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
            Featured Categories
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-md mx-auto">
            Explore our handcrafted designs structured by style and shape categories.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoriesList.map((category) => {
            const imageUrl = category.image || "/luxury_nails_hero.png";
            return (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group relative block aspect-[4/5] rounded-3xl overflow-hidden border border-border/10 bg-card shadow-xs hover:shadow-lg transition-all duration-500"
              >
                {/* Background Image */}
                <Image
                  src={imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Translucent Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

                {/* Card Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end space-y-2 z-10">
                  <h3 className="font-serif text-xl font-normal text-white tracking-wide">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-xs text-white/80 font-light line-clamp-2 leading-relaxed">
                      {category.description}
                    </p>
                  )}
                  
                  {/* Shop CTA indicator */}
                  <div className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-accent pt-1 group-hover:text-accent-hover transition-colors">
                    Shop Category
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

export default FeaturedCategories;
