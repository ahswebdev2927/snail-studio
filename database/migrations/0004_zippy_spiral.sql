ALTER TABLE `product_variants` ADD `status` text DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_new_arrival` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_trending` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `og_image` text;--> statement-breakpoint
ALTER TABLE `products` ADD `status` text DEFAULT 'Active' NOT NULL;