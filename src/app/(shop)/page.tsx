import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Scissors,
  Star,
  Layers,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { db } from "@/db";
import { heroBanners } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { FeaturedProductsRow } from "@/components/storefront/featured-products-row";

export default async function Home() {
  // Fetch active hero banners from database
  const activeBanners = await db.query.heroBanners.findMany({
    where: eq(heroBanners.isActive, true),
    orderBy: asc(heroBanners.sortOrder),
  });

  const featuredProducts = [
    {
      id: "p1",
      name: "Emerald Glamour Coffin Set",
      description: "Rich emerald green coffin shape with hand-painted gold leaf flakes and a velvety matte finish.",
      price: 2499, // in rupees, will normalise in store/drawer
      image: "/emerald_nails_set.png",
      rating: 4.9,
      reviewsCount: 48,
      tags: ["Best Seller", "Matte"],
    },
    {
      id: "p2",
      name: "Blush Marble & Gold Leaf",
      description: "Elegant soft blush pink with white quartz marble accents and liquid gold borders.",
      price: 2999, // in rupees
      image: "/luxury_nails_hero.png",
      rating: 5.0,
      reviewsCount: 32,
      tags: ["Luxury", "Glossy"],
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Hero Banner Carousel (Admin Managed) */}
      <HeroCarousel banners={activeBanners} />

      {/* Brand Values / Benefits */}
      <section id="benefits" className="py-20 bg-background border-y border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
              The Luxury Press-On Experience
            </h2>
            <p className="text-muted-foreground font-light leading-relaxed">
              Designed for the modern individual who values high-end styling, convenience, and nail health.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-secondary/50 border border-border/30 space-y-4 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground">Couture Craftsmanship</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Each set is individually styled with top-tier gel polishes, builder gels, and artistic embellishments for a realistic premium salon look.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-secondary/50 border border-border/30 space-y-4 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground">Zero Damage Application</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Unlike acrylics, our nails apply easily with non-toxic glue or adhesive tabs. Enjoy salon aesthetics without harming your natural nails.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-secondary/50 border border-border/30 space-y-4 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground">Infinite Reusability</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Built with multi-layer structural gel strength, these premium press-ons can be gently removed, stored, and reapplied up to 5+ times.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid / Preview Catalog */}
      <section id="collections" className="py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Exquisite Designs</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
                New Arrivals
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              View All Sets <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Client-side Products Row */}
          <FeaturedProductsRow products={featuredProducts} />
        </div>
      </section>

      {/* Sizing Guide Interactive Preview */}
      <section id="sizing" className="py-20 bg-background border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Sizing text */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Perfect Fit Guaranteed</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
                How to Measure Your Size
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                Getting the perfect fit is key to making your press-ons look like a professional salon manicure and last for weeks. You can measure your nails at home in two easy steps:
              </p>

              <ol className="space-y-4 text-sm font-light text-foreground">
                <li className="flex gap-4">
                  <span className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-xs">1</span>
                  <div>
                    <strong className="font-medium">Tape & Ruler Method:</strong> Place a piece of tape across the widest part of your nail bed, mark the edges, and measure the width in millimeters using a ruler.
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-xs">2</span>
                  <div>
                    <strong className="font-medium">Compare with Chart:</strong> Match your measurements to our standard size sets (XS, S, M, L). If you are between sizes, we recommend sizing up and gently filing the edges.
                  </div>
                </li>
              </ol>

              <div className="pt-2">
                <Link
                  href="/sizing-guide"
                  className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group"
                >
                  Download Printable Sizing Ruler
                  <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Sizing Chart Display */}
            <div className="lg:col-span-7 bg-secondary/30 border border-border/40 rounded-2xl p-6 sm:p-8">
              <h3 className="font-serif text-xl text-foreground font-semibold mb-6 text-center">Standard Size Charts</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="py-3 font-medium text-foreground">Size</th>
                      <th className="py-3 font-medium text-foreground">Thumb</th>
                      <th className="py-3 font-medium text-foreground">Index</th>
                      <th className="py-3 font-medium text-foreground">Middle</th>
                      <th className="py-3 font-medium text-foreground">Ring</th>
                      <th className="py-3 font-medium text-foreground">Pinky</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    <tr>
                      <td className="py-3 font-medium text-primary">XS</td>
                      <td className="py-3 text-muted-foreground">14mm (Size 3)</td>
                      <td className="py-3 text-muted-foreground">10mm (Size 7)</td>
                      <td className="py-3 text-muted-foreground">11mm (Size 6)</td>
                      <td className="py-3 text-muted-foreground">10mm (Size 7)</td>
                      <td className="py-3 text-muted-foreground">8mm (Size 9)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-primary">S</td>
                      <td className="py-3 text-muted-foreground">15mm (Size 2)</td>
                      <td className="py-3 text-muted-foreground">11mm (Size 6)</td>
                      <td className="py-3 text-muted-foreground">12mm (Size 5)</td>
                      <td className="py-3 text-muted-foreground">11mm (Size 6)</td>
                      <td className="py-3 text-muted-foreground">9mm (Size 8)</td>
                    </tr>
                    <tr className="bg-primary/5">
                      <td className="py-3 font-medium text-primary">M (Average)</td>
                      <td className="py-3 text-muted-foreground">16mm (Size 1)</td>
                      <td className="py-3 text-muted-foreground">12mm (Size 5)</td>
                      <td className="py-3 text-muted-foreground">13mm (Size 4)</td>
                      <td className="py-3 text-muted-foreground">12mm (Size 5)</td>
                      <td className="py-3 text-muted-foreground">10mm (Size 7)</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-primary">L</td>
                      <td className="py-3 text-muted-foreground">18mm (Size 0)</td>
                      <td className="py-3 text-muted-foreground">13mm (Size 4)</td>
                      <td className="py-3 text-muted-foreground">14mm (Size 3)</td>
                      <td className="py-3 text-muted-foreground">13mm (Size 4)</td>
                      <td className="py-3 text-muted-foreground">11mm (Size 6)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-card border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-medium">Tip:</strong> Custom sizes are available. You can write your specific thumb-to-pinky millimeter sizing details in the checkout notes.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials / Reviews */}
      <section id="reviews" className="py-20 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Love Notes</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border/30 space-y-6">
              <div className="flex items-center gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-light text-muted-foreground leading-relaxed italic">
                &ldquo;Absolutely blown away by the quality. They feel extremely sturdy and the finish is identical to a professional gel manicure. Got so many compliments on the emerald set!&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">A</div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Ananya R.</h4>
                  <span className="text-[10px] text-muted-foreground">Verified Purchase</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border/30 space-y-6">
              <div className="flex items-center gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-light text-muted-foreground leading-relaxed italic">
                &ldquo;Application took less than 15 minutes, and they lasted a full two weeks without budging. I love that I can pop them off and reuse them again next month.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">P</div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Priya S.</h4>
                  <span className="text-[10px] text-muted-foreground">Verified Purchase</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border/30 space-y-6">
              <div className="flex items-center gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-light text-muted-foreground leading-relaxed italic">
                &ldquo;Beautiful packaging and the sizing was perfect. Snail Studio has saved me so much time and money compared to my usual bi-weekly salon visits.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">K</div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Kriti M.</h4>
                  <span className="text-[10px] text-muted-foreground">Verified Purchase</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
