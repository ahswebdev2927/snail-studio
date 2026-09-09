CREATE TABLE IF NOT EXISTS `return_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`customer_notes` text,
	`status` text DEFAULT 'PENDING_REVIEW' NOT NULL,
	`admin_notes` text,
	`replacement_product_id` text,
	`replacement_variant_id` text,
	`waybill` text,
	`tracking_url` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`payment_responsibility` text DEFAULT 'NONE' NOT NULL,
	`payment_amount` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'NOT_REQUIRED' NOT NULL,
	`payment_method` text,
	`payment_reference` text,
	`payment_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`replacement_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`replacement_variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `return_requests_order_id_idx` ON `return_requests` (`order_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `return_requests_customer_id_idx` ON `return_requests` (`customer_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `return_requests_status_idx` ON `return_requests` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `return_requests_created_at_idx` ON `return_requests` (`created_at`);
