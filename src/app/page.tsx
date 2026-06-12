"use client";

import Image from 'next/image';
import { 
  Sparkles, 
  ShoppingBag, 
  CheckCircle2, 
  Heart, 
  ArrowRight, 
  ShieldCheck, 
  Scissors, 
  Star,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const featuredProducts = [
    {
      id: 'p1',
      name: 'Emerald Glamour Coffin Set',
      description: 'Rich emerald green coffin shape with hand-painted gold leaf flakes and a velvety matte finish.',
      price: 2499,
      image: '/emerald_nails_set.png',
      rating: 4.9,
      reviewsCount: 48,
      tags: ['Best Seller', 'Matte']
    },
    {
      id: 'p2',
      name: 'Blush Marble & Gold Leaf',
      description: 'Elegant soft blush pink with white quartz marble accents and liquid gold borders.',
      price: 2999,
      image: '/luxury_nails_hero.png',
      rating: 5.0,
      reviewsCount: 32,
      tags: ['Luxury', 'Glossy']
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Snail Studio
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <a href="#collections" className="text-foreground/80 hover:text-primary transition-colors">Collections</a>
            <a href="#sizing" className="text-foreground/80 hover:text-primary transition-colors">Sizing Guide</a>
            <a href="#benefits" className="text-foreground/80 hover:text-primary transition-colors">Why Snail Studio</a>
            <a href="#reviews" className="text-foreground/80 hover:text-primary transition-colors">Reviews</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-foreground/85 hover:text-primary transition-colors relative" aria-label="Cart">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <button className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm">
              Shop Now
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-secondary to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium tracking-wide animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Salon Quality. At Home.
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight text-foreground">
                Elegance at Your <span className="font-serif italic font-light text-primary">Fingertips</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                Indulge in couture, hand-designed press-on nails that look and feel like high-end gel manicures. Reusable, non-damaging, and applied in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href="#collections"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/95 shadow-md hover:shadow-lg transition-all group"
                >
                  Explore Collections
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a 
                  href="#sizing"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase border border-border bg-background/50 backdrop-blur-sm hover:bg-background transition-all"
                >
                  Find Your Size
                </a>
              </div>
              
              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40 max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="font-serif text-2xl font-semibold text-primary">100%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Reusable</div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-semibold text-primary">15 Min</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Easy Application</div>
                </div>
                <div>
                  <div className="font-serif text-2xl font-semibold text-primary">14+ Days</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Wear Time</div>
                </div>
              </div>
            </div>

            {/* Hero Image Collage */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="relative w-full max-w-lg aspect-square lg:max-w-xl rounded-2xl overflow-hidden shadow-2xl border-4 border-card/40 bg-card">
                <Image 
                  src="/luxury_nails_hero.png"
                  alt="Snail Studio Luxury Nails Hero Display"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl bg-background/80 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Featured Design</span>
                    <h3 className="font-serif text-lg text-foreground mt-0.5">Blush Marble & Gold Leaf</h3>
                  </div>
                  <span className="font-serif text-lg font-semibold text-accent">₹2,999</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <a href="#all-products" className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View All Sets <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {featuredProducts.map((product) => (
              <div 
                key={product.id}
                className="group flex flex-col md:flex-row bg-card rounded-2xl overflow-hidden border border-border/30 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative w-full md:w-1/2 aspect-square">
                  <Image 
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-background/90 text-primary backdrop-blur-sm rounded-full border border-border/40">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-accent">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-xs font-bold text-foreground">{product.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-muted-foreground">({product.reviewsCount} reviews)</span>
                    </div>
                    <h3 className="font-serif text-xl text-foreground font-medium group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed font-light">
                      {product.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground font-light">Price</span>
                      <span className="font-serif text-2xl font-semibold text-primary">₹{product.price.toLocaleString('en-IN')}</span>
                    </div>
                    <button className="w-full inline-flex items-center justify-center px-4 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <button className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors group">
                  Download Printable Sizing Ruler
                  <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
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
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
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
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
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
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
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

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-background/10 pb-12">
          <div className="space-y-6">
            <span className="font-serif text-2xl font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Snail Studio
            </span>
            <p className="text-xs text-background/60 font-light leading-relaxed max-w-sm">
              Handcrafting premium, luxury press-on nails that offer high-fashion aesthetics without compromise.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif text-sm font-semibold tracking-wider mb-6">Collections</h4>
            <ul className="space-y-3 text-xs text-background/70 font-light">
              <li><a href="#collections" className="hover:text-primary transition-colors">Classics</a></li>
              <li><a href="#collections" className="hover:text-primary transition-colors">Seasonal Specials</a></li>
              <li><a href="#collections" className="hover:text-primary transition-colors">Custom Designs</a></li>
              <li><a href="#collections" className="hover:text-primary transition-colors">Essential Accoutrements</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold tracking-wider mb-6">Client Support</h4>
            <ul className="space-y-3 text-xs text-background/70 font-light">
              <li><a href="#sizing" className="hover:text-primary transition-colors">Sizing Chart & Care</a></li>
              <li><a href="#shipping" className="hover:text-primary transition-colors">Shipping & Returns</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact Support</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Frequently Asked Questions</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-sm font-semibold tracking-wider mb-6">Join Snail Studio</h4>
            <p className="text-xs text-background/70 font-light leading-relaxed mb-4">
              Subscribe to unlock early access to new collections and exclusive offers.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-background/10 border border-background/25 rounded-l-full px-4 py-2.5 text-xs text-background focus:outline-none focus:border-primary transition-colors"
                required
              />
              <button 
                type="submit"
                className="bg-primary text-primary-foreground font-semibold text-xs px-5 py-2.5 rounded-r-full hover:bg-primary/95 transition-colors uppercase tracking-widest"
              >
                Join
              </button>
            </form>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-background/50 font-light gap-4">
          <p>&copy; {new Date().getFullYear()} Snail Studio. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
