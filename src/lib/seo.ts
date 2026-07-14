import type { Metadata } from "next";

/**
 * Resolves the base URL for the application.
 * Defaults to the production URL with a local fallback.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://snailstudio.in";
}

/**
 * Returns an absolute URL for a given path.
 */
export function getAbsoluteUrl(path: string): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${cleanPath}`;
}

/**
 * Helper to build standard metadata objects with pre-configured fallbacks.
 */
export interface BaseMetadataOptions {
  title: string;
  description: string;
  path: string;
  imageUrl?: string;
  keywords?: string;
  noIndex?: boolean;
}

export function getBaseMetadata(options: BaseMetadataOptions): Metadata {
  const canonicalUrl = getAbsoluteUrl(options.path);
  const images = options.imageUrl
    ? [{ url: options.imageUrl, alt: options.title }]
    : [{ url: getAbsoluteUrl("/og-image.jpg"), alt: "Snail Studio | Premium Press-On Nails" }];

  const metadata: Metadata = {
    title: options.title,
    description: options.description,
    keywords: options.keywords || "press-on nails, custom nails, luxury nails, salon nails, Snail Studio",
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonicalUrl,
      siteName: "Snail Studio",
      locale: "en_IN",
      type: "website",
      images: images,
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: images,
    },
  };

  if (options.noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  }

  return metadata;
}

/**
 * Organization Schema.org JSON-LD.
 */
interface OrganizationInput {
  name?: string;
  logoUrl?: string;
  socials?: string[];
}

export function getOrganizationJsonLd(input?: OrganizationInput) {
  const name = input?.name || "Snail Studio";
  const logoUrl = input?.logoUrl || getAbsoluteUrl("/logo.png");
  const socials = input?.socials || [
    "https://www.instagram.com/snailstudio.in",
    "https://www.facebook.com/snailstudio",
    "https://pinterest.com/snailstudio"
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": getAbsoluteUrl("/#organization"),
    "name": name,
    "url": getAbsoluteUrl("/"),
    "logo": {
      "@type": "ImageObject",
      "url": logoUrl
    },
    "sameAs": socials
  };
}

/**
 * Website Schema.org JSON-LD with Sitelinks Searchbox integration.
 */
export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": getAbsoluteUrl("/#website"),
    "name": "Snail Studio",
    "url": getAbsoluteUrl("/"),
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": getAbsoluteUrl("/shop?search={search_term_string}")
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Product Schema.org JSON-LD.
 */
export interface ProductJsonLdInput {
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  priceMin: number; // in paise
  priceMax: number; // in paise
  imageUrl?: string;
  sku?: string;
  brandName?: string;
  categoryName?: string;
  isInStock: boolean;
  reviewCount: number;
  averageRating: number;
  reviews?: Array<{
    authorName: string;
    datePublished: Date | string;
    comment?: string | null;
    rating: number;
    title?: string | null;
  }>;
}

export function getProductJsonLd(input: ProductJsonLdInput) {
  const productUrl = getAbsoluteUrl(`/products/${input.slug}`);
  const description = input.description || input.shortDescription || `Shop ${input.name} — premium handcrafted press-on nails.`;

  const offers: any = {
    "@type": "AggregateOffer",
    "priceCurrency": "INR",
    "lowPrice": (input.priceMin / 100).toFixed(2),
    "highPrice": (input.priceMax / 100).toFixed(2),
    "offerCount": input.reviewCount || 1,
    "url": productUrl,
    "availability": input.isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
  };

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": getAbsoluteUrl(`/products/${input.slug}#product`),
    "name": input.name,
    "image": input.imageUrl ? [input.imageUrl] : [],
    "description": description,
    "url": productUrl,
    "sku": input.sku || input.slug,
    "offers": offers,
  };

  if (input.brandName) {
    schema.brand = {
      "@type": "Brand",
      "name": input.brandName,
    };
  }

  if (input.categoryName) {
    schema.category = input.categoryName;
  }

  if (input.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": input.averageRating.toFixed(1),
      "reviewCount": input.reviewCount,
      "bestRating": "5",
      "worstRating": "1",
    };
  }

  if (input.reviews && input.reviews.length > 0) {
    schema.review = input.reviews.map((rev) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": rev.authorName,
      },
      "datePublished": typeof rev.datePublished === 'string' 
        ? rev.datePublished 
        : rev.datePublished.toISOString().split('T')[0],
      "reviewBody": rev.comment || rev.title || "Excellent quality!",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": rev.rating,
        "bestRating": "5",
        "worstRating": "1",
      },
    }));
  }

  return schema;
}

/**
 * FAQ Schema.org JSON-LD.
 */
export interface FAQItem {
  q: string;
  a: string;
}

export function getFAQJsonLd(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a,
      },
    })),
  };
}

/**
 * Breadcrumb Schema.org JSON-LD.
 */
export interface BreadcrumbCrumb {
  name: string;
  url?: string;
}

export function getBreadcrumbJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": crumbs.map((crumb, index) => {
      const item: any = {
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
      };
      if (crumb.url) {
        item.item = getAbsoluteUrl(crumb.url);
      }
      return item;
    }),
  };
}

/**
 * Collection (ItemList) Schema.org JSON-LD.
 */
export interface CollectionItemInput {
  name: string;
  slug: string;
  price: number; // in paise
  imageUrl?: string;
}

export function getCollectionJsonLd(collectionName: string, items: CollectionItemInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": collectionName,
    "numberOfItems": items.length,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": getAbsoluteUrl(`/products/${item.slug}`),
      "name": item.name,
      "image": item.imageUrl ? [item.imageUrl] : [],
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": (item.price / 100).toFixed(2),
      },
    })),
  };
}
