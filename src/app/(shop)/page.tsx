import React from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Star,
} from "lucide-react";
import { db } from "@/db";
import { heroBanners, products, sizeProfiles } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { FeaturedCategories } from "@/components/storefront/featured-categories";
import { FeaturedCollections } from "@/components/storefront/featured-collections";
import { ProductCard } from "@/components/storefront/product-card";
import { WhyChooseUs } from "@/components/storefront/why-choose-us";
import { InstagramGallery } from "@/components/storefront/instagram-gallery";
import { CustomerTestimonials } from "@/components/storefront/customer-testimonials";
import { InteractiveSizing } from "@/components/storefront/interactive-sizing";
import { RecentlyViewed } from "@/features/pdp/recently-viewed";




export const revalidate = 3600; // Cache homepage for 1 hour

export default async function Home() {
  // Fetch hero banners, dynamic product rows, and size profiles in parallel
  const [activeBanners, bestSellers, newArrivals, trending, activeSizes] = await Promise.all([
    db.query.heroBanners.findMany({
      where: eq(heroBanners.isActive, true),
      orderBy: asc(heroBanners.sortOrder),
    }),
    db.query.products.findMany({
      where: and(eq(products.isActive, true), eq(products.isBestSeller, true)),
      with: { media: { with: { media: true } } },
      limit: 4,
    }),
    db.query.products.findMany({
      where: and(eq(products.isActive, true), eq(products.isNewArrival, true)),
      with: { media: { with: { media: true } } },
      limit: 4,
    }),
    db.query.products.findMany({
      where: and(eq(products.isActive, true), eq(products.isTrending, true)),
      with: { media: { with: { media: true } } },
      limit: 4,
    }),
    db.query.sizeProfiles.findMany({
      where: eq(sizeProfiles.isActive, true),
      orderBy: asc(sizeProfiles.thumb), // Sort by Thumb width (XS -> S -> M -> L)
    }),
  ]);

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Hero Banner Carousel (Admin Managed) */}
      <HeroCarousel banners={activeBanners} />

      {/* Featured Categories Grid */}
      <FeaturedCategories />

      {/* Featured Collections Grid */}
      <FeaturedCollections />

      {/* Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section id="best-sellers" className="py-20 bg-secondary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">Our Most Loved Sets</span>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
                  Best Sellers
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Brand Values / Benefits */}
      <WhyChooseUs />

      {/* New Arrivals Section */}
      {newArrivals.length > 0 && (
        <section id="new-arrivals" className="py-20 bg-secondary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">Freshly Handcrafted</span>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
                  New Arrivals
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sizing Guide Interactive Preview */}
      <InteractiveSizing sizeProfiles={activeSizes} />

      {/* Trending Section */}
      {trending.length > 0 && (
        <section id="trending" className="py-20 bg-secondary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">On-Trend Now</span>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
                  Trending Products
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {trending.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Products Section */}
      <RecentlyViewed />

      {/* Instagram/Social Gallery Showcase */}
      <InstagramGallery />

      {/* Customer Testimonials Slider Showcase */}
      <CustomerTestimonials />
    </div>
  );
}
