CREATE TABLE `product_attribute_media` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`attribute_value_id` text NOT NULL,
	`media_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attribute_value_id`) REFERENCES `attribute_values`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pam_product_id_idx` ON `product_attribute_media` (`product_id`);--> statement-breakpoint
CREATE INDEX `pam_attribute_value_id_idx` ON `product_attribute_media` (`attribute_value_id`);--> statement-breakpoint
CREATE INDEX `pam_media_id_idx` ON `product_attribute_media` (`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pam_prod_attr_media_uq` ON `product_attribute_media` (`product_id`,`attribute_value_id`,`media_id`);--> statement-breakpoint
ALTER TABLE `attribute_values` ADD `color_hex` text;