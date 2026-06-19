import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Sparkles, AlertCircle, ShoppingBag, Layers, Shield } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ProductPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      variants: {
        with: {
          inventory: true,
        }
      },
      media: {
        with: {
          media: true,
        }
      },
      brand: true,
      category: true,
    }
  });

  if (!product) {
    notFound();
  }

  const featuredMedia = product.media.find(m => m.isFeatured) || product.media[0];
  const imageUrl = featuredMedia?.media?.url;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <Link 
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Catalog
        </Link>

        {/* Preview Alert Banner */}
        <div className="p-4.5 bg-accent/10 border border-accent/20 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Storefront Preview Mode</h4>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              This page displays a mock representation of the design at the dynamic storefront route <code className="px-1.5 py-0.5 bg-secondary/80 rounded font-mono">/products/{slug}</code>. The storefront checkout flows and page templates will be fully realized in future phase integrations.
            </p>
          </div>
        </div>

        {/* Main Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border border-border/40 rounded-3xl p-6 shadow-sm">
          {/* Left: Image Preview */}
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-secondary/30 border border-border flex items-center justify-center relative">
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Layers className="w-12 h-12 text-muted-foreground/30" />
            )}
            <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                product.status === "Active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {product.status}
              </span>
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {product.category?.name || "Press-On Set"}
                </span>
                <h1 className="font-serif text-3xl font-normal text-foreground leading-tight">
                  {product.name}
                </h1>
                <p className="text-xs font-light text-muted-foreground">
                  Slug: <code className="font-mono bg-secondary/50 px-1 py-0.5 rounded text-[10px]">{product.slug}</code>
                </p>
              </div>

              <div className="text-2xl font-serif text-foreground font-light">
                {product.priceMin === product.priceMax 
                  ? `₹${(product.priceMin / 100).toLocaleString("en-IN")}`
                  : `₹${(product.priceMin / 100).toLocaleString("en-IN")} - ₹${(product.priceMax / 100).toLocaleString("en-IN")}`}
              </div>

              <div className="border-t border-border/30 my-4"></div>

              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Copy</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-light">
                  {product.shortDescription || "No short description provided."}
                </p>
              </div>

              {product.description && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-light border-l-2 border-border/60 pl-3 italic">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Variants list summary */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Available Sizing & Sku Options ({product.variants.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => (
                    <span 
                      key={v.id} 
                      className={`px-2.5 py-1 rounded-xl text-[10px] border font-mono ${
                        v.status === "Active"
                          ? "bg-secondary/40 border-border text-foreground"
                          : "bg-secondary/10 border-border/20 text-muted-foreground opacity-50 line-through"
                      }`}
                    >
                      {v.sku} (₹{v.price / 100})
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Fallback Button */}
              <button 
                disabled 
                className="w-full py-3.5 bg-primary/20 text-primary/60 border border-primary/10 rounded-2xl text-xs font-semibold uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                Checkout Disabled in Preview
              </button>
            </div>
          </div>
        </div>

        {/* Quality Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-card border border-border/30 rounded-2xl text-center space-y-1.5">
            <Sparkles className="w-5 h-5 text-accent mx-auto" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Handcrafted Art</h5>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">Designed by professional salon technicians.</p>
          </div>
          <div className="p-4 bg-card border border-border/30 rounded-2xl text-center space-y-1.5">
            <Layers className="w-5 h-5 text-primary mx-auto" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Multi-Use Sizing</h5>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">Can be reapplied up to 5 times with glue tabs.</p>
          </div>
          <div className="p-4 bg-card border border-border/30 rounded-2xl text-center space-y-1.5">
            <Shield className="w-5 h-5 text-emerald-500 mx-auto" />
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Secure Fit Guarantee</h5>
            <p className="text-[10px] text-muted-foreground font-light leading-snug">Includes custom prep pad and cuticle wand.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
