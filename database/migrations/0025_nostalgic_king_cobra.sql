PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`icon` text,
	`cta_text` text,
	`cta_link` text,
	`text_color` text DEFAULT '#ffffff' NOT NULL,
	`background_color` text DEFAULT '#AC5429' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_announcements`("id", "text", "icon", "cta_text", "cta_link", "text_color", "background_color", "start_date", "end_date", "is_active", "sort_order", "created_at", "updated_at") SELECT "id", "text", "icon", "cta_text", "cta_link", "text_color", "background_color", "start_date", "end_date", "is_active", "sort_order", "created_at", "updated_at" FROM `announcements`;--> statement-breakpoint
DROP TABLE `announcements`;--> statement-breakpoint
ALTER TABLE `__new_announcements` RENAME TO `announcements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_created_at_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `inventory_items_stock_level_idx` ON `inventory_items` (`stock_level`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_item_id_idx` ON `inventory_transactions` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `launch_events_product_id_idx` ON `launch_events` (`product_id`);--> statement-breakpoint
CREATE INDEX `launch_events_event_type_idx` ON `launch_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `launch_events_created_at_idx` ON `launch_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `customer_tags_created_at_idx` ON `customer_tags` (`created_at`);