import { Suspense } from "react";
import ShopCatalog from "./shop-catalog";
import { CatalogSkeleton } from "@/components/storefront/skeletons/catalog-skeleton";
import type { Metadata } from "next";
import { db } from "@/db";
import { products, categories, collections, productCollections } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getBaseMetadata, getCollectionJsonLd, getBreadcrumbJsonLd } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; collection?: string }>;
}): Promise<Metadata> {
  const { category, collection } = await searchParams;

  let title = "Shop Luxury Nails | Snail Studio Catalog";
  let description = "Browse and filter our custom-designed, luxury press-on nail sets. Filter by nail shape, length, finish/texture, color, and price to find your perfect fit.";
  let path = "/shop";

  if (category) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, category),
    });
    if (cat) {
      title = `${cat.name} Press-On Nails | Snail Studio`;
      description = cat.description || `Browse our exclusive collection of ${cat.name} custom press-on nails. Handcrafted, premium quality, and reusable.`;
      path = `/shop?category=${encodeURIComponent(category)}`;
    }
  } else if (collection) {
    const col = await db.query.collections.findFirst({
      where: eq(collections.slug, collection),
    });
    if (col) {
      title = `${col.name} Collection | Snail Studio`;
      description = col.description || `Explore our signature ${col.name} press-on nail sets. Handcrafted, reusable, and tailored to perfection.`;
      path = `/shop?collection=${encodeURIComponent(collection)}`;
    }
  }

  return getBaseMetadata({
    title,
    description,
    path,
    keywords: "press-on nails, luxury fake nails, custom nails, nail designs, Snail Studio catalog",
  });
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; collection?: string }>;
}) {
  const { category, collection } = await searchParams;

  let productsList: any[] = [];
  let collectionName = "Shop Luxury Nails | Snail Studio Catalog";
  const crumbs = [{ name: "Home", url: "/" }, { name: "Shop", url: "/shop" }];

  try {
    if (category) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, category),
      });
      if (cat) {
        collectionName = `${cat.name} | Snail Studio`;
        crumbs.push({ name: cat.name, url: `/shop?category=${category}` });

        productsList = await db.query.products.findMany({
          where: and(
            eq(products.categoryId, cat.id),
            eq(products.isActive, true)
          ),
          limit: 24,
          with: {
            media: {
              with: { media: true },
            },
          },
        });
      }
    } else if (collection) {
      const col = await db.query.collections.findFirst({
        where: eq(collections.slug, collection),
      });
      if (col) {
        collectionName = `${col.name} | Snail Studio`;
        crumbs.push({ name: col.name, url: `/shop?collection=${collection}` });

        const colProductLinks = await db
          .select({ productId: productCollections.productId })
          .from(productCollections)
          .where(eq(productCollections.collectionId, col.id));

        const productIds = colProductLinks.map((link) => link.productId);

        if (productIds.length > 0) {
          productsList = await db.query.products.findMany({
            where: and(
              inArray(products.id, productIds),
              eq(products.isActive, true)
            ),
            limit: 24,
            with: {
              media: {
                with: { media: true },
              },
            },
          });
        }
      }
    } else {
      productsList = await db.query.products.findMany({
        where: eq(products.isActive, true),
        limit: 24,
        with: {
          media: {
            with: { media: true },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error fetching products for catalog JSON-LD:", error);
  }

  const collectionJsonLd = getCollectionJsonLd(
    collectionName,
    productsList.map((p) => {
      const featuredMedia = p.media?.find((m: any) => m.isFeatured) ?? p.media?.[0];
      return {
        name: p.name,
        slug: p.slug,
        price: p.priceMin,
        imageUrl: featuredMedia?.media?.url,
      };
    })
  );

  const breadcrumbJsonLd = getBreadcrumbJsonLd(crumbs);

  return (
    <>
      {/* Catalog schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<CatalogSkeleton />}>
        <ShopCatalog />
      </Suspense>
    </>
  );
}
