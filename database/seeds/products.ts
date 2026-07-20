import { db } from "../../src/db";
import { 
  products, 
  productVariants, 
  inventoryItems, 
  categories, 
  attributeValues, 
  productAttributeValues, 
  variantAttributeValues,
  media,
  productMedia,
  heroBanners,
  sizeProfiles
} from "../../src/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function seedProducts() {
  console.log("Seeding products, variants, media, and inventory...");

  // 1. Fetch Categories for mapping
  const cats = await db.query.categories.findMany();
  const getCatIdBySlug = (slug: string) => cats.find(c => c.slug === slug)?.id || null;

  // 2. Fetch Attribute Values for mapping
  const attrVals = await db.query.attributeValues.findMany({
    with: {
      group: true
    }
  });

  const getAttrValIdByCode = (groupCode: string, code: string) => {
    return attrVals.find(av => av.group?.code === groupCode && av.code === code)?.id || null;
  };

  const productData = [
    {
      name: "Emerald Glamour Coffin Set",
      slug: "emerald-glamour-coffin-set",
      description: "Rich emerald green coffin shape with hand-painted gold leaf flakes and a velvety matte finish.",
      shortDescription: "Rich emerald green matte set with gold leaf accents.",
      categorySlug: "nail-art",
      price: 2499, // INR
      compareAtPrice: 2999, // INR
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: true,
      imageUrl: "/emerald_nails_set.png",
      attributes: {
        shape: "coffin",
        length: "medium",
        texture: "matte",
        style: "classic",
        occasion: "wedding"
      }
    },
    {
      name: "Blush Marble & Gold Leaf",
      slug: "blush-marble-gold-leaf",
      description: "Elegant soft blush pink with white quartz marble accents and liquid gold borders.",
      shortDescription: "Soft blush pink with white quartz marble and gold borders.",
      categorySlug: "nail-art",
      price: 2999, // INR
      compareAtPrice: 3499, // INR
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      isTrending: true,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {
        shape: "almond",
        length: "medium",
        texture: "glossy",
        style: "ombre",
        occasion: "wedding"
      }
    },
    {
      name: "French Classic Almond",
      slug: "french-classic-almond",
      description: "Timeless sheer pink base with clean, hand-painted white tips for an ultra-chic look.",
      shortDescription: "Timeless sheer pink base with hand-painted white French tips.",
      categorySlug: "french-and-ombre",
      price: 1999, // INR
      compareAtPrice: 2299, // INR
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {
        shape: "almond",
        length: "short",
        texture: "glossy",
        style: "french",
        occasion: "casual"
      }
    },
    {
      name: "Midnight Starlet Stiletto",
      slug: "midnight-starlet-stiletto",
      description: "Deep stellar black base with reflective holographic glitter overlays and stiletto tips.",
      shortDescription: "Deep black base with reflective holographic glitter.",
      categorySlug: "glitter-and-chrome",
      price: 3499, // INR
      compareAtPrice: 3999, // INR
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
      imageUrl: "/emerald_nails_set.png",
      attributes: {
        shape: "stiletto",
        length: "long",
        texture: "glitter",
        style: "classic",
        occasion: "party"
      }
    },
    {
      name: "Rose Quartz Ombre",
      slug: "rose-quartz-ombre",
      description: "Soft gradient transitioning from a translucent nude base to a beautiful soft pink tip.",
      shortDescription: "Soft gradient transitioning from nude to translucent pink.",
      categorySlug: "french-and-ombre",
      price: 2199, // INR
      compareAtPrice: 2499, // INR
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {
        shape: "almond",
        length: "medium",
        texture: "glossy",
        style: "ombre",
        occasion: "casual"
      }
    },
    {
      name: "Sugar & Spice Glitter Square",
      slug: "sugar-spice-glitter-square",
      description: "Sweet nude pink base adorned with golden sugar glitter dust and clean square edges.",
      shortDescription: "Sweet nude pink base with golden sugar glitter dust.",
      categorySlug: "glitter-and-chrome",
      price: 2399, // INR
      compareAtPrice: 2799, // INR
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: true,
      imageUrl: "/emerald_nails_set.png",
      attributes: {
        shape: "square",
        length: "short",
        texture: "glitter",
        style: "classic",
        occasion: "festive"
      }
    },
    {
      name: "Crimson Passion Oval",
      slug: "crimson-passion-oval",
      description: "Classic high-gloss deep crimson red set that never goes out of style. Clean and bold.",
      shortDescription: "Classic high-gloss deep crimson red set.",
      categorySlug: "solid-colors",
      price: 1899, // INR
      compareAtPrice: 2199, // INR
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {
        shape: "almond",
        length: "medium",
        texture: "glossy",
        style: "classic",
        occasion: "party"
      }
    },
    {
      name: "Matte Noir Minimalist",
      slug: "matte-noir-minimalist",
      description: "Sleek and minimalist matte black nails with high gloss line accent details.",
      shortDescription: "Sleek and minimalist matte black nails.",
      categorySlug: "solid-colors",
      price: 2099, // INR
      compareAtPrice: 2399, // INR
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      isTrending: true,
      imageUrl: "/emerald_nails_set.png",
      attributes: {
        shape: "coffin",
        length: "long",
        texture: "matte",
        style: "minimalist",
        occasion: "casual"
      }
    },
    {
      name: "Professional Strong Nail Glue",
      slug: "professional-strong-nail-glue",
      description: "Long-wear professional nail glue for secure, salon-quality adhesion that lasts up to 2-3 weeks.",
      shortDescription: "Long-wear professional nail glue.",
      categorySlug: "nail-glue",
      price: 249, // INR
      compareAtPrice: 299, // INR
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {}
    },
    {
      name: "Adhesive Double-Sided Nail Tabs",
      slug: "adhesive-double-sided-nail-tabs",
      description: "Temporary double-sided nail adhesive tabs. Perfect for photo shoots, events, or short-term weekend wear.",
      shortDescription: "Temporary double-sided nail adhesive tabs.",
      categorySlug: "adhesive-tabs",
      price: 149, // INR
      compareAtPrice: 199, // INR
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {}
    },
    {
      name: "Nail Prep & Care Kit",
      slug: "nail-prep-and-care-kit",
      description: "Includes a mini nail file, buffer block, cuticle wood pusher, and alcohol prep wipes for perfect application prep.",
      shortDescription: "Complete prep kit for press-on nails application.",
      categorySlug: "prep-kits",
      price: 199, // INR
      compareAtPrice: 249, // INR
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      isTrending: false,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {}
    },
    {
      name: "Sizing Kit (All Nail Shapes)",
      slug: "sizing-kit-all-nail-shapes",
      description: "Sample kit containing all 10 standard sizes of our nail shapes so you can find your perfect fit.",
      shortDescription: "Nails sizing sample kit.",
      categorySlug: "prep-kits",
      price: 150, // INR
      compareAtPrice: 199, // INR
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {}
    },
    {
      name: "Velvet Wine Stiletto Set",
      slug: "velvet-wine-stiletto-set",
      description: "A gorgeous and rich velvet wine red stiletto set, hand-crafted with luxury salon-quality builder gel and a glossy finish.",
      shortDescription: "Rich velvet wine red stiletto set.",
      categorySlug: "nail-art",
      price: 2699, // INR
      compareAtPrice: 3199, // INR
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isTrending: true,
      imageUrl: "/luxury_nails_hero.png",
      attributes: {
        shape: "stiletto",
        length: "long",
        texture: "glossy",
        style: "classic",
        occasion: "party"
      }
    },
    {
      name: "Pastel Lavender Square Set",
      slug: "pastel-lavender-square-set",
      description: "Soft, chic pastel lavender shade in standard square shape with clean edges and a high-gloss protective topcoat.",
      shortDescription: "Soft chic pastel lavender square set.",
      categorySlug: "solid-colors",
      price: 1799, // INR
      compareAtPrice: 1999, // INR
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: true,
      isTrending: false,
      imageUrl: "/emerald_nails_set.png",
      attributes: {
        shape: "square",
        length: "short",
        texture: "glossy",
        style: "minimalist",
        occasion: "casual"
      }
    }
  ];

  await db.transaction(async (tx) => {
    for (const p of productData) {
      // Check if product already exists
      const existingProduct = await tx.query.products.findFirst({
        where: eq(products.slug, p.slug)
      });

      if (existingProduct) {
        console.log(`Product with slug ${p.slug} already exists. Skipping.`);
        continue;
      }

      const productId = `prod_${nanoid(10)}`;
      const priceMinPaise = p.price * 100;
      const priceMaxPaise = p.price * 100;

      // 1. Insert product
      await tx.insert(products).values({
        id: productId,
        brandId: "brd_snail_studio",
        categoryId: getCatIdBySlug(p.categorySlug),
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        priceMin: priceMinPaise,
        priceMax: priceMaxPaise,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        isNewArrival: p.isNewArrival,
        isTrending: p.isTrending,
        status: "Active",
        isActive: true
      });

      // 2. Add product attribute values
      for (const [groupCode, valCode] of Object.entries(p.attributes)) {
        const valId = getAttrValIdByCode(groupCode, valCode);
        if (valId) {
          await tx.insert(productAttributeValues).values({
            productId,
            attributeValueId: valId
          });
        }
      }

      // 3. Create Media
      const mediaId = `med_${nanoid(10)}`;
      await tx.insert(media).values({
        id: mediaId,
        url: p.imageUrl,
        publicId: `mock_${p.slug}`,
        fileName: `${p.slug}.png`,
        resourceType: "image"
      });

      await tx.insert(productMedia).values({
        productId,
        mediaId,
        isFeatured: true,
        sortOrder: 0
      });

      // 4. Create Variants (XS, S, M, L or Default for accessories)
      const isAccessory = ["adhesive-tabs", "nail-glue", "prep-kits"].includes(p.categorySlug);

      if (isAccessory) {
        const variantId = `var_${nanoid(10)}`;
        const sku = `SKU-${p.slug.substring(0, 8).toUpperCase()}-DEFAULT`;

        await tx.insert(productVariants).values({
          id: variantId,
          productId,
          sku,
          name: `${p.name} - Default`,
          price: priceMinPaise,
          compareAtPrice: p.compareAtPrice ? p.compareAtPrice * 100 : null,
          status: "Active"
        });

        await tx.insert(inventoryItems).values({
          id: `inv_${nanoid(10)}`,
          variantId,
          stockLevel: 100, // plenty of stock for accessories
          lowStockThreshold: 5
        });
      } else {
        const sizes = [
          { name: "XS (Extra Small)", code: "xs" },
          { name: "S (Small)", code: "s" },
          { name: "M (Medium)", code: "m" },
          { name: "L (Large)", code: "l" }
        ];

        for (const size of sizes) {
          const variantId = `var_${nanoid(10)}`;
          const sku = `SKU-${p.slug.substring(0, 8).toUpperCase()}-${size.code.toUpperCase()}`;

          await tx.insert(productVariants).values({
            id: variantId,
            productId,
            sku,
            name: `${p.name} - ${size.name}`,
            price: priceMinPaise,
            compareAtPrice: p.compareAtPrice ? p.compareAtPrice * 100 : null,
            status: "Active"
          });

          // Insert inventory stock item (make one variant of "French Classic Almond" out of stock for testing)
          const isOutOfStock = p.slug === "french-classic-almond" && size.code === "xs";
          const stockLevel = isOutOfStock ? 0 : 15;

          await tx.insert(inventoryItems).values({
            id: `inv_${nanoid(10)}`,
            variantId,
            stockLevel,
            lowStockThreshold: 5
          });
        }
      }
    }
  });

  // Seed Hero Banners
  const existingBanners = await db.query.heroBanners.findMany();
  if (existingBanners.length === 0) {
    console.log("Seeding hero banners...");
    await db.insert(heroBanners).values([
      {
        id: `ban_${nanoid(10)}`,
        imageUrl: "/luxury_nails_hero.png",
        title: "Elegance at Your Fingertips",
        subtitle: "Indulge in couture, hand-designed press-on nails that look and feel like high-end gel manicures.",
        ctaText: "Explore Collections",
        ctaLink: "/shop",
        sortOrder: 0,
        isActive: true
      },
      {
        id: `ban_${nanoid(10)}`,
        imageUrl: "/emerald_nails_set.png",
        title: "Salon Quality. At Home.",
        subtitle: "Reusable, non-damaging, and applied in minutes. Enjoy the beauty without the cost or damage.",
        ctaText: "Shop New Sets",
        ctaLink: "/shop?sort=newest",
        sortOrder: 1,
        isActive: true
      },
      {
        id: `ban_${nanoid(10)}`,
        imageUrl: "/luxury_nails_hero.png",
        title: "Couture Craftsmanship",
        subtitle: "Each set is individually styled with top-tier builder gels and artistic gold-leaf accents.",
        ctaText: "Find Your Size",
        ctaLink: "/sizing-guide",
        sortOrder: 2,
        isActive: true
      }
    ]);
    console.log("Hero banners seeded successfully!");
  }

  // Seed Size Profiles
  const existingSizes = await db.query.sizeProfiles.findMany();
  if (existingSizes.length === 0) {
    console.log("Seeding default size profiles...");
    await db.insert(sizeProfiles).values([
      {
        id: `sz_${nanoid(10)}`,
        name: "XS",
        description: "Petite hands",
        thumb: 14,
        index: 10,
        middle: 11,
        ring: 10,
        pinky: 8,
        isActive: true
      },
      {
        id: `sz_${nanoid(10)}`,
        name: "S",
        description: "Small hands",
        thumb: 15,
        index: 11,
        middle: 12,
        ring: 11,
        pinky: 9,
        isActive: true
      },
      {
        id: `sz_${nanoid(10)}`,
        name: "M",
        description: "Average / Standard hands",
        thumb: 16,
        index: 12,
        middle: 13,
        ring: 12,
        pinky: 10,
        isActive: true
      },
      {
        id: `sz_${nanoid(10)}`,
        name: "L",
        description: "Larger hands",
        thumb: 18,
        index: 13,
        middle: 14,
        ring: 13,
        pinky: 11,
        isActive: true
      }
    ]);
    console.log("Size profiles seeded successfully!");
  }

  console.log("Products and dependencies seeded successfully!");
}
