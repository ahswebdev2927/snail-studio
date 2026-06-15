CREATE INDEX `product_variants_price_idx` ON `product_variants` (`price`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_brand_id_idx` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `products_category_id_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_is_active_idx` ON `products` (`is_active`);--> statement-breakpoint
CREATE INDEX `products_is_featured_idx` ON `products` (`is_featured`);--> statement-breakpoint
CREATE INDEX `products_is_best_seller_idx` ON `products` (`is_best_seller`);