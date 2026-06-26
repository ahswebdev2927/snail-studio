import { db } from "@/db";
import { products, reviews, orders, orderItems, productVariants } from "@/db/schema";
import { eq, ne, avg, count, and, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { ProductGallery, GalleryMediaItem } from "@/features/pdp/product-gallery";
import { ProductInfo } from "@/features/pdp/product-info";
import { ProductActions, ProductVariantFull } from "@/features/pdp/product-actions";
import { BreadcrumbItem } from "@/features/pdp/pdp-breadcrumb";
import { ProductTabs } from "@/features/pdp/product-tabs";
import { ProductReviews } from "@/features/pdp/product-reviews";
import { RelatedProducts } from "@/features/pdp/related-products";
import { FrequentlyBoughtTogether } from "@/features/pdp/frequently-bought-together";
import { RecentlyViewedTracker, RecentlyViewed } from "@/features/pdp/recently-viewed";

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

  const featuredMedia =
    product.media.find((m) => m.isFeatured) ?? product.media[0];
  const ogImageUrl = featuredMedia?.media?.url ?? undefined;

  const title = product.metaTitle ?? `${product.name} | Snail Studio`;
  const description =
    product.metaDescription ??
    product.shortDescription ??
    `Shop ${product.name} — premium handcrafted press-on nails by Snail Studio.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   "website",
      locale: "en_IN",
      images: ogImageUrl ? [{ url: ogImageUrl, alt: product.name }] : undefined,
    },
    alternates: { canonical: `/products/${slug}` },
  };
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

  /* ----- 2.2 User Session Eligibility Check ----- */
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const user = token ? await getSessionUser(token) : null;

  let eligibility = {
    isLoggedIn: false,
    hasPurchased: false,
    isDelivered: false,
    isEligible: false,
    remainingMinutes: 0,
  };

  if (user) {
    // Check if this user purchased the product
    const userOrders = variantIds.length > 0 ? await db
      .select({
        id: orders.id,
        status: orders.status,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, user.id),
          inArray(orderItems.variantId, variantIds)
        )
      ) : [];

    const hasPurchased = userOrders.length > 0;
    const deliveredOrders = userOrders.filter((o) => o.status === "delivered");
    const isDelivered = deliveredOrders.length > 0;

    let isEligible = false;
    let remainingMinutes = 0;
    
    if (isDelivered) {
      const mostRecent = deliveredOrders.reduce((latest, current) => {
        return current.updatedAt > latest.updatedAt ? current : latest;
      }, deliveredOrders[0]);

      const timeDiff = Date.now() - mostRecent.updatedAt.getTime();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      
      if (timeDiff >= TWO_HOURS) {
        isEligible = true;
      } else {
        remainingMinutes = Math.ceil((TWO_HOURS - timeDiff) / (60 * 1000));
      }
    }

    eligibility = {
      isLoggedIn: true,
      hasPurchased,
      isDelivered,
      isEligible,
      remainingMinutes,
    };
  }

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



  /* ----- 3. Shape gallery media ----- */
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
      })),
    }));

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

  /* ----- 6. JSON-LD Product schema ----- */
  const featuredMedia = galleryMedia.find((m) => m.isFeatured) ?? galleryMedia[0];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type":    "Product",
    name:        product.name,
    description: product.description ?? product.shortDescription ?? undefined,
    image:       featuredMedia?.url,
    sku:         fullVariants[0]?.sku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    offers: {
      "@type":        "AggregateOffer",
      priceCurrency:  "INR",
      lowPrice:       (product.priceMin / 100).toFixed(2),
      highPrice:      (product.priceMax / 100).toFixed(2),
      offerCount:     fullVariants.filter((v) => v.status === "Active").length,
      availability:
        product.status === "Out Of Stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type":      "AggregateRating",
        ratingValue:  averageRating.toFixed(1),
        reviewCount,
        bestRating:   5,
        worstRating:  1,
      },
    }),
  };

  /* ----- 7. Primary image URL for cart item thumbnail ----- */
  const primaryImageUrl =
    galleryMedia.find((m) => m.isFeatured)?.url ?? galleryMedia[0]?.url;

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

  const currentProductFbt = {
    id: product.id,
    name: product.name,
    imageUrl: primaryImageUrl,
    variants: fullVariants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      stockLevel: v.stockLevel,
    })),
  };

  const recommendationsFbt = dbRecommendations.map((p) => {
    const pPrimaryImageUrl = p.media.find((m) => m.isFeatured)?.media?.url ?? p.media[0]?.media?.url;
    return {
      id: p.id,
      name: p.name,
      imageUrl: pPrimaryImageUrl,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        stockLevel: v.inventory?.stockLevel ?? 0,
      })),
    };
  });

  /* ----- 7.2 Fetch Recently Viewed Products ----- */
  const recentlyViewedCookie = cookieStore.get("snail_recently_viewed")?.value;
  const viewedSlugs = recentlyViewedCookie
    ? recentlyViewedCookie.split(",").filter((s) => s && s !== slug)
    : [];

  const dbRecentlyViewed = viewedSlugs.length > 0
    ? await db.query.products.findMany({
        where: and(
          eq(products.isActive, true),
          inArray(products.slug, viewedSlugs)
        ),
        with: {
          media: {
            with: { media: true },
            orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
          },
        },
      })
    : [];

  const recentlyViewedProducts = dbRecentlyViewed.sort((a, b) => {
    return viewedSlugs.indexOf(a.slug) - viewedSlugs.indexOf(b.slug);
  });

  /* ----- 8. Render ----- */
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Background tracking for Recently Viewed cookie */}
      <RecentlyViewedTracker slug={product.slug} />

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
              />
            </div>
          </div>
        </section>

        {/* ---- Product Tabs Section (Description, Wear Guide, Shipping, FAQs) ---- */}
        <ProductTabs description={product.description} />

        {/* ---- Customer Reviews Section ---- */}
        <ProductReviews
          productId={product.id}
          reviews={formattedReviews}
          averageRating={averageRating}
          reviewCount={reviewCount}
          eligibility={eligibility}
        />

        {/* ---- Frequently Bought Together Section ---- */}
        <FrequentlyBoughtTogether
          currentProduct={currentProductFbt}
          recommendations={recommendationsFbt}
        />

        {/* ---- Related Products Section ---- */}
        <RelatedProducts products={relatedProducts} />

        {/* ---- Recently Viewed Section ---- */}
        <RecentlyViewed products={recentlyViewedProducts} />
      </div>
    </>
  );
}
