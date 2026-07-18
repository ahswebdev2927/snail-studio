import { db } from "@/db";
import { products, reviews, orders, orderItems, productVariants, productBundles, productBundleItems } from "@/db/schema";
import { eq, ne, avg, count, and, inArray, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProductGallery, GalleryMediaItem } from "@/features/pdp/product-gallery";
import { ProductInfo } from "@/features/pdp/product-info";
import { ProductActions, ProductVariantFull } from "@/features/pdp/product-actions";
import { BreadcrumbItem } from "@/features/pdp/pdp-breadcrumb";
import { ProductTabs } from "@/features/pdp/product-tabs";
import { ProductReviews } from "@/features/pdp/product-reviews";
import { RelatedProducts } from "@/features/pdp/related-products";
import { FrequentlyBoughtTogether } from "@/features/pdp/frequently-bought-together";
import { RecentlyViewedTracker, RecentlyViewed } from "@/features/pdp/recently-viewed";
import { getBaseMetadata, getProductJsonLd, getBreadcrumbJsonLd, getFAQJsonLd } from "@/lib/seo";
import { getOptimizedImageUrl } from "@/lib/cloudinary/utils";

export const revalidate = 3600; // Cache pages for 1 hour, then regenerate in background
export const dynamicParams = true; // Support dynamic rendering of newly added products

export async function generateStaticParams() {
  const activeProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    columns: {
      slug: true,
    },
  });

  return activeProducts.map((p) => ({
    slug: p.slug,
  }));
}

/* -----------------------------------------------------------------------
 * generateMetadata — SSR SEO per product
 * --------------------------------------------------------------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      media: { with: { media: true } },
      category: true,
    },
  });

  if (!product) {
    return { title: "Product Not Found | Snail Studio" };
  }

  const featuredMedia = product.media.find((m) => m.isFeatured) ?? product.media[0];
  const rawImageUrl = featuredMedia?.media?.url;
  
  // Transform Cloudinary image to standard OG size (1200x630)
  const ogImageUrl = rawImageUrl 
    ? getOptimizedImageUrl(rawImageUrl, { width: 1200, height: 630, crop: "fill", gravity: "auto" })
    : undefined;

  const title = product.metaTitle ?? `${product.name} | Snail Studio`;
  const description =
    product.metaDescription ??
    product.shortDescription ??
    `Shop ${product.name} — premium handcrafted press-on nails by Snail Studio.`;

  // Build page-specific keywords
  const keywordsList = ["press-on nails", "snail studio", product.name.toLowerCase()];
  if (product.category?.name) keywordsList.push(product.category.name.toLowerCase());

  return getBaseMetadata({
    title,
    description,
    path: `/products/${slug}`,
    imageUrl: ogImageUrl,
    keywords: keywordsList.join(", "),
  });
}

/* -----------------------------------------------------------------------
 * ProductPage — Server Component
 * --------------------------------------------------------------------- */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  /* ----- 1. Fetch product with all relations ----- */
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      brand:    true,
      category: true,
      attributeValues: {
        with: {
          attributeValue: {
            with: {
              group: true
            }
          }
        }
      },
      variants: {
        with: {
          inventory: true,
          attributes: {
            with: {
              attributeValue: {
                with: { group: true },
              },
            },
          },
        },
      },
      media: {
        with:    { media: true },
        orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
      },
    },
  });

  if (!product || !product.isActive) {
    notFound();
  }



  /* ----- 2. Approved reviews aggregate ----- */
  const reviewStats = await db
    .select({
      averageRating: avg(reviews.rating),
      reviewCount:   count(reviews.id),
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.productId, product.id),
        eq(reviews.isApproved, true)
      )
    );

  const averageRating = Number(reviewStats[0]?.averageRating ?? 0) || 4.8;
  const reviewCount   = Number(reviewStats[0]?.reviewCount   ?? 0);

  /* ----- 2.1 Fetch Approved Reviews list ----- */
  const dbReviews = await db.query.reviews.findMany({
    where: and(
      eq(reviews.productId, product.id),
      eq(reviews.isApproved, true)
    ),
    with: {
      user: true,
      images: {
        with: {
          media: true
        }
      }
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });

  // Fetch all user IDs who have purchased this product and had it delivered
  const variantIds = product.variants.map((v) => v.id);
  
  const buyers = variantIds.length > 0 ? await db
    .select({ userId: orders.userId })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        inArray(orderItems.variantId, variantIds),
        eq(orders.status, "delivered")
      )
    ) : [];
  const verifiedUserIds = new Set(buyers.map((b) => b.userId).filter(Boolean));

  const formattedReviews = dbReviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewerName: r.user?.name || "Verified Buyer",
    isVerifiedPurchase: verifiedUserIds.has(r.userId),
    images: r.images
      .filter((ri) => ri.media)
      .map((ri) => ({
        id: ri.media.id,
        url: ri.media.url,
        altText: ri.media.altText,
      })),
  }));

  const eligibility = {
    isLoggedIn: false,
    hasPurchased: false,
    isDelivered: false,
    isEligible: false,
    remainingMinutes: 0,
  };

  /* ----- 2.3 Fetch Related Category Products ----- */
  let relatedProducts = await db.query.products.findMany({
    where: and(
      eq(products.categoryId, product.categoryId || ""),
      eq(products.isActive, true),
      ne(products.id, product.id)
    ),
    limit: 6,
    with: {
      media: {
        with: { media: true },
        orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
      },
    },
  });

  // Fallback to featured products if fewer than 4 related items found
  if (relatedProducts.length < 4) {
    const fallbackProducts = await db.query.products.findMany({
      where: and(
        eq(products.isActive, true),
        ne(products.id, product.id),
        eq(products.isFeatured, true)
      ),
      limit: 6 - relatedProducts.length,
      with: {
        media: {
          with: { media: true },
          orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
        },
      },
    });

    const existingIds = new Set(relatedProducts.map((p) => p.id));
    for (const p of fallbackProducts) {
      if (!existingIds.has(p.id)) {
        relatedProducts.push(p);
      }
    }
  }

  /* ----- 2.2 Query active bundles that include this product ----- */
  const dbBundles = await db.query.productBundles.findMany({
    where: eq(productBundles.isActive, true),
    with: {
      items: {
        with: {
          product: {
            with: {
              variants: {
                with: {
                  inventory: true,
                  attributes: {
                    with: {
                      attributeValue: {
                        with: { group: true }
                      }
                    }
                  }
                }
              },
              media: {
                with: { media: true },
                orderBy: (pm, { asc }) => [asc(pm.sortOrder)]
              }
            }
          }
        }
      }
    }
  });

  const relevantBundles = dbBundles.filter((b) =>
    b.items.some((item) => item.productId === product.id)
  );
  const rawBundles = relevantBundles as any;
  const galleryMedia: GalleryMediaItem[] = product.media
    .filter((pm) => pm.media)
    .map((pm) => ({
      id:           pm.media.id,
      url:          pm.media.url,
      publicId:     pm.media.publicId,
      resourceType: pm.media.resourceType,
      format:       pm.media.format,
      altText:      pm.media.altText,
      width:        pm.media.width,
      height:       pm.media.height,
      isFeatured:   pm.isFeatured,
      sortOrder:    pm.sortOrder,
    }));

  /* ----- 4. Shape full variants (with attribute details for selector) ----- */
  const fullVariants: ProductVariantFull[] = product.variants
    .filter((v) => v.status !== "Archived")
    .map((v) => ({
      id:               v.id,
      sku:              v.sku,
      name:             v.name,
      price:            v.price,
      compareAtPrice:   v.compareAtPrice,
      status:           v.status as "Active" | "Disabled" | "Archived",
      stockLevel:       v.inventory?.stockLevel       ?? 0,
      lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
      attributes: v.attributes.map((a) => ({
        groupCode: a.attributeValue.group.code,
        groupName: a.attributeValue.group.name,
        valueCode: a.attributeValue.code,
        valueName: a.attributeValue.value,
        valueId:   a.attributeValue.id,
        visibleOnPdp: a.attributeValue.group.visibleOnPdp,
      })),
    }));

  /* ----- 4.5 Extract catalog attributes for PDP display ----- */
  const catalogAttributesMap = (product.attributeValues || [])
    .map((pav) => pav.attributeValue)
    .filter((val) => val && val.group && val.group.attributeType === "CATALOG" && val.group.visibleOnPdp === true)
    .reduce<Record<string, { name: string; displayOrder: number; values: string[] }>>((acc, val) => {
      const groupCode = val.group.code;
      if (!acc[groupCode]) {
        acc[groupCode] = {
          name: val.group.name,
          displayOrder: val.group.displayOrder ?? 0,
          values: [],
        };
      }
      if (!acc[groupCode].values.includes(val.value)) {
        acc[groupCode].values.push(val.value);
      }
      return acc;
    }, {});

  const sortedCatalogAttributes = Object.entries(catalogAttributesMap)
    .map(([code, data]) => ({
      code,
      name: data.name,
      displayOrder: data.displayOrder,
      values: data.values,
    }))
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });

  /* ----- 5. Breadcrumb items ----- */
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Shop", href: "/shop" },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href:  `/shop?category=${product.category.slug}`,
          },
        ]
      : []),
    { label: product.name },
  ];

  /* ----- 7. Primary image URL for cart item thumbnail ----- */
  const primaryImageUrl =
    galleryMedia.find((m) => m.isFeatured)?.url ?? galleryMedia[0]?.url;

  /* ----- 6. JSON-LD schemas ----- */
  const productJsonLd = getProductJsonLd({
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    imageUrl: primaryImageUrl,
    sku: fullVariants[0]?.sku,
    brandName: product.brand?.name,
    categoryName: product.category?.name,
    isInStock: product.status !== "Out Of Stock",
    reviewCount,
    averageRating,
    reviews: formattedReviews.map(r => ({
      authorName: r.reviewerName,
      datePublished: r.createdAt,
      comment: r.comment,
      rating: r.rating,
      title: r.title,
    })),
  });

  const breadcrumbJsonLd = getBreadcrumbJsonLd(
    breadcrumbs.map((crumb) => ({
      name: crumb.label,
      url: crumb.href,
    }))
  );

  const productFaqs = [
    {
      q: "Are Snail Studio press-on nails reusable?",
      a: "Yes! If you apply them using our Adhesive Glue Tabs, they can be easily peeled off and reused multiple times. If you use Liquid Nail Glue, they are still reusable if you gently buff away the old glue residue from the back of the press-on nails using the wooden stick and nail buffer included in your kit.",
    },
    {
      q: "How do I find my correct nail size?",
      a: "No measuring required! Every Snail Studio press-on nail set comes with 24 nails covering 10 to 12 different sizes. This ensures a perfect fit for every finger shape and size, with extra spares to customize your fit.",
    },
    {
      q: "Will press-on nails damage my natural nails?",
      a: "No! Adhesive tabs cause zero damage and are perfect for short-term wear. For liquid glue, as long as you follow our recommended soak-off removal guide (using warm soapy water and cuticle oil) and never rip them off by force, your natural nails will remain completely healthy and undamaged.",
    },
    {
      q: "How long do they last?",
      a: "Adhesive tabs typically last 1 to 3 days, making them perfect for weekend wear or special events. Liquid nail glue can last 2 to 3 weeks with proper application, light prep, and a secure fit.",
    },
  ];
  const faqJsonLd = getFAQJsonLd(productFaqs);

  /* ----- 7.1 Fetch Frequently Bought Together (FBT) Recommendations ----- */
  const dbRecommendations = await db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      ne(products.id, product.id)
    ),
    limit: 2,
    with: {
      variants: {
        with: { inventory: true },
        where: eq(productVariants.status, "Active"),
      },
      media: {
        with: { media: true },
        orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
      },
    },
  });

  // Map database bundles that contain this product
  const dbFormattedBundles = relevantBundles.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    discountType: b.discountType,
    discountValue: b.discountValue,
    items: b.items.map((item) => {
      const prod = item.product;
      const prodPrimaryImageUrl = prod.media.find((m) => m.isFeatured)?.media?.url ?? prod.media[0]?.media?.url ?? "";
      return {
        productId: item.productId,
        product: {
          id: prod.id,
          name: prod.name,
          imageUrl: prodPrimaryImageUrl,
          variants: prod.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            stockLevel: v.inventory?.stockLevel ?? 0,
          })),
        },
      };
    }),
  }));

  // Fallback to dynamic recommendation bundle if no DB bundles are defined
  let formattedBundles;
  if (dbFormattedBundles.length > 0) {
    formattedBundles = dbFormattedBundles;
  } else {
    const fallbackBundle = {
      id: "fbt_fallback",
      name: "Frequently Bought Together",
      description: "Bundle complementary accessories and styles to complete your luxury manicure setup.",
      discountType: "percentage" as const,
      discountValue: 15, // 15% discount
      items: [
        {
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            imageUrl: primaryImageUrl,
            variants: fullVariants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stockLevel: v.stockLevel,
            })),
          },
        },
        ...dbRecommendations.map((rec) => {
          const recPrimaryImageUrl = rec.media.find((m) => m.isFeatured)?.media?.url ?? rec.media[0]?.media?.url ?? "";
          return {
            productId: rec.id,
            product: {
              id: rec.id,
              name: rec.name,
              imageUrl: recPrimaryImageUrl,
              variants: rec.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                stockLevel: v.inventory?.stockLevel ?? 0,
              })),
            },
          };
        }),
      ],
    };
    formattedBundles = [fallbackBundle];
  }

  /* ----- 7.2 Prepare Recently Viewed Tracker Details ----- */
  const trackerProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    priceMin: product.priceMin,
    priceMax: product.priceMax,
    rating: averageRating,
    reviewsCount: reviewCount,
    images: galleryMedia.map((m) => ({ url: m.url })),
    categoryName: product.category?.name || null,
  };

  /* ----- 8. Render ----- */
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Background tracking for Recently Viewed history */}
      <RecentlyViewedTracker product={trackerProduct} />

      <div className="bg-background text-foreground transition-colors duration-300">
        {/* ---- PDP Main Grid ---- */}
        <section
          aria-label={`${product.name} product details`}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-8 lg:gap-14 items-start">

            {/* Left: Gallery — sticky on large screens */}
            <div className="lg:sticky lg:top-28">
              <ProductGallery media={galleryMedia} productName={product.name} />
            </div>

            {/* Right: Info + Actions stacked in sequence */}
            <div className="flex flex-col gap-6 lg:gap-7">
              {/* Static product info */}
              <ProductInfo
                product={{
                  id:               product.id,
                  name:             product.name,
                  slug:             product.slug,
                  shortDescription: product.shortDescription,
                  isBestSeller:     product.isBestSeller,
                  isNewArrival:     product.isNewArrival,
                  isTrending:       product.isTrending,
                  isFeatured:       product.isFeatured,
                  category: product.category
                    ? { name: product.category.name, slug: product.category.slug }
                    : null,
                  reviewCount,
                  averageRating,
                }}
                breadcrumbs={breadcrumbs}
              />

              {/* Divider between info and actions */}
              <div className="border-t border-border/30" />

              {/* Interactive: price, variants, qty, add to cart, buy now */}
              <ProductActions
                productId={product.id}
                productName={product.name}
                productImageUrl={primaryImageUrl}
                variants={fullVariants}
                productStatus={product.status}
                launchDate={product.launchDate}
                launchTime={product.launchTime}
              />
            </div>
          </div>
        </section>

        {/* ---- Product Tabs Section (Description, Wear Guide, Shipping, FAQs) ---- */}
        <ProductTabs description={product.description} specifications={sortedCatalogAttributes} />

        {/* ---- Frequently Bought Together Section ---- */}
        <FrequentlyBoughtTogether
          bundles={formattedBundles}
          currentProductId={product.id}
        />

        {/* ---- Customer Reviews Section ---- */}
        <ProductReviews
          productId={product.id}
          reviews={formattedReviews}
          averageRating={averageRating}
          reviewCount={reviewCount}
          eligibility={eligibility}
        />

        {/* ---- Related Products Section ---- */}
        <RelatedProducts products={relatedProducts} />

        {/* ---- Recently Viewed Section ---- */}
        <RecentlyViewed currentSlug={product.slug} />
      </div>
    </>
  );
}
