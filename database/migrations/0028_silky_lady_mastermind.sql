PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`carrier` text DEFAULT 'Delhivery' NOT NULL,
	`provider` text DEFAULT 'delhivery' NOT NULL,
	`courier_order_id` text NOT NULL,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`waybill` text,
	`tracking_number` text NOT NULL,
	`tracking_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`serviceability_status` text DEFAULT 'unknown',
	`serviceability_checked_at` integer,
	`is_external` integer DEFAULT false NOT NULL,
	`external_courier_name` text,
	`external_metadata` text,
	`shipped_at` integer,
	`estimated_delivery_at` integer,
	`cancelled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_shipments`("id", "order_id", "carrier", "provider", "courier_order_id", "attempt_number", "waybill", "tracking_number", "tracking_url", "status", "serviceability_status", "serviceability_checked_at", "is_external", "external_courier_name", "external_metadata", "shipped_at", "estimated_delivery_at", "cancelled_at", "created_at", "updated_at") SELECT "id", "order_id", "carrier", 'delhivery', "order_id", 1, NULL, "tracking_number", NULL, "status", 'unknown', NULL, 0, NULL, NULL, "shipped_at", "estimated_delivery_at", NULL, unixepoch(), unixepoch() FROM `shipments`;--> statement-breakpoint
DROP TABLE `shipments`;--> statement-breakpoint
ALTER TABLE `__new_shipments` RENAME TO `shipments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `shipments_order_id_idx` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `shipments_courier_order_id_idx` ON `shipments` (`courier_order_id`);--> statement-breakpoint
CREATE INDEX `shipments_waybill_idx` ON `shipments` (`waybill`);--> statement-breakpoint
CREATE INDEX `shipments_status_idx` ON `shipments` (`status`);