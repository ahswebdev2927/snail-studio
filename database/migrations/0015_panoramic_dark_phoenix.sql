CREATE TABLE `order_address_history` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`version` integer NOT NULL,
	`edited_by` text NOT NULL,
	`old_address` text NOT NULL,
	`new_address` text NOT NULL,
	`shipping_before` integer NOT NULL,
	`shipping_after` integer NOT NULL,
	`difference` integer NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_charge_paid` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `current_shipping_charge` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_difference` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_difference_paid` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_difference_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_calculated_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `address_locked_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `address_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `address_verified` integer DEFAULT false NOT NULL;