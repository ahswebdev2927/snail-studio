CREATE TABLE `customer_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_tags_user_id_idx` ON `customer_tags` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_tags_user_tag_uniq` ON `customer_tags` (`user_id`,`tag`);--> statement-breakpoint
CREATE TABLE `recently_viewed` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recently_viewed_user_id_idx` ON `recently_viewed` (`user_id`);--> statement-breakpoint
CREATE INDEX `recently_viewed_user_id_created_at_idx` ON `recently_viewed` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `recently_viewed_user_product_idx` ON `recently_viewed` (`user_id`,`product_id`);--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD `created_at` integer DEFAULT 1770847900 NOT NULL;--> statement-breakpoint
CREATE INDEX `user_audit_logs_user_id_idx` ON `user_audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_audit_logs_created_at_idx` ON `user_audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `wishlists_user_id_idx` ON `wishlists` (`user_id`);--> statement-breakpoint
CREATE INDEX `reviews_user_id_idx` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `reviews_product_id_idx` ON `reviews` (`product_id`);--> statement-breakpoint
CREATE INDEX `coupon_usage_user_id_idx` ON `coupon_usage` (`user_id`);