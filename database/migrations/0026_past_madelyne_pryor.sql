CREATE TABLE `coupon_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `coupon_reservations_coupon_id_idx` ON `coupon_reservations` (`coupon_id`);--> statement-breakpoint
CREATE INDEX `coupon_reservations_order_id_idx` ON `coupon_reservations` (`order_id`);--> statement-breakpoint
CREATE INDEX `coupon_reservations_expires_at_idx` ON `coupon_reservations` (`expires_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_coupon_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_coupon_usage`("id", "coupon_id", "order_id", "user_id", "created_at") SELECT "id", "coupon_id", "order_id", "user_id", "created_at" FROM `coupon_usage`;--> statement-breakpoint
DROP TABLE `coupon_usage`;--> statement-breakpoint
ALTER TABLE `__new_coupon_usage` RENAME TO `coupon_usage`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `coupon_usage_user_id_idx` ON `coupon_usage` (`user_id`);--> statement-breakpoint
ALTER TABLE `coupons` ADD `applicable_products` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `applicable_categories` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `applicable_collections` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `excluded_products` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `excluded_categories` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `excluded_collections` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `customer_eligibility` text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE `coupons` ADD `eligible_user_ids` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `eligible_segments` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `eligible_tags` text;--> statement-breakpoint
ALTER TABLE `coupons` ADD `per_user_limit` integer;