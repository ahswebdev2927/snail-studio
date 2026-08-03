import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

/**
 * Zod schema to trim and sanitize text strings.
 * Removes all HTML tags and event scripts to prevent XSS payloads.
 */
export const sanitizedStringSchema = z.string().transform((val) => DOMPurify.sanitize(val.trim()));

/**
 * Zod schema to trim and sanitize HTML (rich text) strings.
 * Filters dangerous elements (scripts, frames, triggers) while preserving safe structural formatting.
 */
export const sanitizedHtmlSchema = z.string().transform((val) =>
  DOMPurify.sanitize(val.trim(), {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "ul", "ol", "li", "br", "span",
      "h1", "h2", "h3", "h4", "h5", "h6"
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  })
);
