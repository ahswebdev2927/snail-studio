import { db } from "@/db";
import { categories, attributeGroups, collections } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface NavigationItem {
  name: string;
  slug: string;
  url: string;
}

export interface NavigationCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  children: NavigationCategory[];
}

export interface PromoBanner {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string | null;
}

export interface StorefrontNavigation {
  shop: {
    shapes: NavigationItem[];
    lengths: NavigationItem[];
    occasions: NavigationItem[];
    collections: NavigationItem[];
  };
  categories: NavigationCategory[];
  promoBanner: PromoBanner | null;
}

function buildCategoryTree(flatList: any[]): NavigationCategory[] {
  const tree: NavigationCategory[] = [];
  const map: Record<string, NavigationCategory> = {};

  flatList.forEach((item) => {
    map[item.id] = {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      image: item.image,
      children: [],
    };
  });

  flatList.forEach((item) => {
    const mappedNode = map[item.id];
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(mappedNode);
    } else {
      tree.push(mappedNode);
    }
  });

  const sortTreeNodes = (nodes: NavigationCategory[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortTreeNodes(node.children);
      }
    });
  };

  sortTreeNodes(tree);
  return tree;
}

export async function getStorefrontNavigation(): Promise<StorefrontNavigation> {
  try {
    const [shapeGroup, lengthGroup, occasionGroup, activeCollectionsList, allCategoriesList] = await Promise.all([
      db.query.attributeGroups.findFirst({
        where: eq(attributeGroups.code, "shape"),
        with: {
          values: true,
        },
      }),
      db.query.attributeGroups.findFirst({
        where: eq(attributeGroups.code, "length"),
        with: {
          values: true,
        },
      }),
      db.query.attributeGroups.findFirst({
        where: eq(attributeGroups.code, "occasion"),
        with: {
          values: true,
        },
      }),
      db.query.collections.findMany({
        where: eq(collections.isActive, true),
        with: {
          media: {
            limit: 1,
            with: {
              media: true,
            },
          },
        },
        orderBy: asc(collections.name),
      }),
      db.query.categories.findMany({
        orderBy: asc(categories.name),
      }),
    ]);

    const shapes: NavigationItem[] = (shapeGroup?.values || []).map((val) => ({
      name: val.value,
      slug: val.code,
      url: `/shop?shape=${encodeURIComponent(val.value)}`,
    }));

    const lengths: NavigationItem[] = (lengthGroup?.values || []).map((val) => ({
      name: val.value,
      slug: val.code,
      url: `/shop?length=${encodeURIComponent(val.value)}`,
    }));

    const occasions: NavigationItem[] = (occasionGroup?.values || []).map((val) => ({
      name: val.value,
      slug: val.code,
      url: `/shop?occasion=${encodeURIComponent(val.value)}`,
    }));

    const collectionsList: NavigationItem[] = activeCollectionsList.map((col) => ({
      name: col.name,
      slug: col.slug,
      url: `/shop?collection=${encodeURIComponent(col.slug)}`,
    }));

    // Find the first collection with a description/media to serve as the promo banner
    let promoBanner: PromoBanner | null = null;
    const bannerCol = activeCollectionsList.find((col) => col.description);
    if (bannerCol) {
      const bannerMedia = bannerCol.media?.[0]?.media;
      promoBanner = {
        title: bannerCol.name,
        subtitle: bannerCol.description || "",
        ctaText: "Shop Now",
        ctaLink: `/shop?collection=${encodeURIComponent(bannerCol.slug)}`,
        imageUrl: bannerMedia?.url || null,
      };
    }

    const categoriesTree = buildCategoryTree(allCategoriesList);

    return {
      shop: {
        shapes,
        lengths,
        occasions,
        collections: collectionsList,
      },
      categories: categoriesTree,
      promoBanner,
    };
  } catch (error) {
    console.error("Error in getStorefrontNavigation:", error);
    // Safe fallbacks
    return {
      shop: {
        shapes: [],
        lengths: [],
        occasions: [],
        collections: [],
      },
      categories: [],
      promoBanner: null,
    };
  }
}
