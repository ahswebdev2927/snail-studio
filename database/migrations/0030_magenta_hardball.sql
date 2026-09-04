CREATE TABLE `shipment_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`order_id` text NOT NULL,
	`admin_id` text,
	`admin_name` text DEFAULT 'Admin' NOT NULL,
	`action` text NOT NULL,
	`previous_state` text,
	`new_state` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shipment_audit_logs_order_id_idx` ON `shipment_audit_logs` (`order_id`);--> statement-breakpoint
CREATE INDEX `shipment_audit_logs_shipment_id_idx` ON `shipment_audit_logs` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `shipment_audit_logs_created_at_idx` ON `shipment_audit_logs` (`created_at`);