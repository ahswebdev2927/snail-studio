import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, categories, collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAbsoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Static Storefront Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: getAbsoluteUrl("/shop"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/sizing-guide"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    // 2. Fetch Active Products
    const dbProducts = await db.query.products.findMany({
      where: eq(products.isActive, true),
      columns: {
        slug: true,
        updatedAt: true,
      },
    });

    const productEntries: MetadataRoute.Sitemap = dbProducts.map((p) => ({
      url: getAbsoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 3. Fetch Categories
    const dbCategories = await db.query.categories.findMany({
      columns: {
        slug: true,
        updatedAt: true,
      },
    });

    const categoryEntries: MetadataRoute.Sitemap = dbCategories.map((c) => ({
      url: getAbsoluteUrl(`/shop?category=${encodeURIComponent(c.slug)}`),
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    // 4. Fetch Active Collections
    const dbCollections = await db.query.collections.findMany({
      where: eq(collections.isActive, true),
      columns: {
        slug: true,
        updatedAt: true,
      },
    });

    const collectionEntries: MetadataRoute.Sitemap = dbCollections.map((col) => ({
      url: getAbsoluteUrl(`/shop?collection=${encodeURIComponent(col.slug)}`),
      lastModified: col.updatedAt ? new Date(col.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [
      ...staticPages,
      ...productEntries,
      ...categoryEntries,
      ...collectionEntries,
    ];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
