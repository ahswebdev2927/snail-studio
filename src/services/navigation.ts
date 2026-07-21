import { db } from "@/db";
import { categories, attributeGroups, collections, systemSettings } from "@/db/schema";
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
    attributeGroups: {
      name: string;
      code: string;
      values: NavigationItem[];
    }[];
    collections: NavigationItem[];
    categories: NavigationItem[];
  };
  navbarCollections: NavigationItem[];
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
    const [dropdownGroups, activeCollectionsList, allCategoriesList, promoRow] = await Promise.all([
      db.query.attributeGroups.findMany({
        where: eq(attributeGroups.showInDropdown, true),
        with: {
          values: true,
        },
        orderBy: asc(attributeGroups.displayOrder),
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
        orderBy: asc(collections.sortOrder),
      }),
      db.query.categories.findMany({
        orderBy: asc(categories.sortOrder),
      }),
      db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, "shop_dropdown_promo"),
      }),
    ]);

    // Format dynamic attribute groups
    const shopAttributeGroups = dropdownGroups.map((group) => ({
      name: group.name,
      code: group.code,
      values: (group.values || []).map((val) => ({
        name: val.value,
        slug: val.code,
        url: `/shop?${group.code}=${encodeURIComponent(val.code)}`,
      })),
    }));

    // Format dynamic collections in dropdown
    const shopCollections = activeCollectionsList
      .filter((col) => col.showInDropdown)
      .map((col) => ({
        name: col.name,
        slug: col.slug,
        url: `/shop?collection=${encodeURIComponent(col.slug)}`,
      }));

    // Format collections configured for main navbar
    const navbarCollections = activeCollectionsList
      .filter((col) => col.showInNavbar)
      .map((col) => ({
        name: col.name,
        slug: col.slug,
        url: `/shop?collection=${encodeURIComponent(col.slug)}`,
      }));

    // Format dynamic categories in dropdown
    const shopCategories = allCategoriesList
      .filter((cat) => cat.showInDropdown)
      .map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        url: `/shop?category=${encodeURIComponent(cat.slug)}`,
      }));

    // Resolve custom promo banner
    let promoBanner: PromoBanner | null = null;
    if (promoRow?.value) {
      try {
        const parsed = JSON.parse(promoRow.value);
        if (parsed.enabled) {
          promoBanner = {
            title: parsed.title || "",
            subtitle: parsed.subtitle || "",
            ctaText: parsed.ctaText || "Shop Now",
            ctaLink: parsed.ctaLink || "/shop",
            imageUrl: parsed.imageUrl || null,
          };
        }
      } catch (e) {
        console.error("Failed to parse shop_dropdown_promo settings in navigation service:", e);
      }
    }

    // Fallback if custom promo banner is not configured/enabled
    if (!promoBanner) {
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
    }

    const categoriesTree = buildCategoryTree(allCategoriesList);

    return {
      shop: {
        attributeGroups: shopAttributeGroups,
        collections: shopCollections,
        categories: shopCategories,
      },
      navbarCollections,
      categories: categoriesTree,
      promoBanner,
    };
  } catch (error) {
    console.error("Error in getStorefrontNavigation:", error);
    // Safe fallbacks
    return {
      shop: {
        attributeGroups: [],
        collections: [],
        categories: [],
      },
      navbarCollections: [],
      categories: [],
      promoBanner: null,
    };
  }
}
