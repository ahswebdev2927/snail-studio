import React from "react";
import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Star,
} from "lucide-react";
import { db } from "@/db";
import { heroBanners, products, sizeProfiles } from "@/db/schema";
import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
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
  // Calculate trend score using point-based weights:
  // - Delivered order quantity: 0.5 points
  // - Active cart quantity: 0.3 points
  // - Wishlist count: 0.1 points
  // - Product views: 0.01 points
  // - Admin manual isTrending override: 10.0 points (ensuring it stays on top)
  const scoreSql = sql<number>`(
    COALESCE((
      SELECT SUM(oi.quantity) * 0.5 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE pv.product_id = "products"."id" AND o.status = 'delivered'
    ), 0) +
    COALESCE((
      SELECT SUM(ci.quantity) * 0.3 
      FROM cart_items ci
      JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE pv.product_id = "products"."id"
    ), 0) +
    COALESCE((
      SELECT COUNT(*) * 0.1 
      FROM wishlist_items wi
      WHERE wi.product_id = "products"."id"
    ), 0) +
    ("products"."views" * 0.01) +
    (CASE WHEN "products"."is_trending" = 1 THEN 10.0 ELSE 0.0 END)
  )`;

  // Calculate bestseller score using point-based weights:
  // - Quantity sold in completed/active sales (paid, confirmed, processing, shipped, delivered): 1.0 points
  // - Admin manual isBestSeller override: 25.0 points (ensuring it stays on top)
  const bestsellerScoreSql = sql<number>`(
    COALESCE((
      SELECT SUM(oi.quantity) 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE pv.product_id = "products"."id" AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
    ), 0) +
    (CASE WHEN "products"."is_best_seller" = 1 THEN 25.0 ELSE 0.0 END)
  )`;

  // Fetch the top 4 product IDs sorted by trend score and bestseller score
  const [trendingProductIds, bestsellerProductIds] = await Promise.all([
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(sql`${scoreSql} DESC`)
      .limit(4),
    db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(sql`${bestsellerScoreSql} DESC`)
      .limit(4),
  ]);

  const trendingIds = trendingProductIds.map((p) => p.id);
  const bestsellerIds = bestsellerProductIds.map((p) => p.id);

  // Fetch hero banners, dynamic product rows, and size profiles in parallel
  const [activeBanners, unsortedBestsellers, newArrivals, unsortedTrending, activeSizes] = await Promise.all([
    db.query.heroBanners.findMany({
      where: eq(heroBanners.isActive, true),
      orderBy: asc(heroBanners.sortOrder),
    }),
    bestsellerIds.length > 0
      ? db.query.products.findMany({
          where: inArray(products.id, bestsellerIds),
          with: { media: { with: { media: true } } },
        })
      : Promise.resolve([]),
    db.query.products.findMany({
      where: eq(products.isActive, true),
      orderBy: [desc(products.isNewArrival), desc(products.createdAt)],
      with: { media: { with: { media: true } } },
      limit: 4,
    }),
    trendingIds.length > 0
      ? db.query.products.findMany({
          where: inArray(products.id, trendingIds),
          with: { media: { with: { media: true } } },
        })
      : Promise.resolve([]),
    db.query.sizeProfiles.findMany({
      where: eq(sizeProfiles.isActive, true),
      orderBy: asc(sizeProfiles.thumb), // Sort by Thumb width (XS -> S -> M -> L)
    }),
  ]);

  // Sort bestseller products to match the ranked order of IDs
  const bestSellers = bestsellerIds
    .map((id) => unsortedBestsellers.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  // Sort trending products to match the ranked order of IDs
  const trending = trendingIds
    .map((id) => unsortedTrending.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Hero Banner Carousel (Admin Managed) */}
      <HeroCarousel banners={activeBanners} />

      {/* Featured Categories Grid */}
      <FeaturedCategories />


      {/* Best Sellers Section */}
      {bestSellers.length > 0 && (
        <section id="best-sellers" className="py-16 bg-secondary/10">
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
        <section id="new-arrivals" className="py-16 bg-secondary/10">
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

      {/* Featured Collections Grid */}
      <FeaturedCollections />


      {/* Trending Section */}
      {trending.length > 0 && (
        <section id="trending" className="py-16 bg-secondary/10">
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
      {/* Sizing Guide Interactive Preview */}
      <InteractiveSizing sizeProfiles={activeSizes} />
      {/* Recently Viewed Products Section */}
      <RecentlyViewed />

      {/* Instagram/Social Gallery Showcase */}
      <InstagramGallery />

      {/* Customer Testimonials Slider Showcase */}
      <CustomerTestimonials />
    </div>
  );
}
