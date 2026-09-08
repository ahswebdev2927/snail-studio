CREATE TABLE IF NOT EXISTS `shipment_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`provider` text DEFAULT 'delhivery' NOT NULL,
	`exception_type` text NOT NULL,
	`provider_code` text,
	`reason` text,
	`remark` text,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'ACTION_REQUIRED' NOT NULL,
	`occurred_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `shipment_exceptions_shipment_id_idx` ON `shipment_exceptions` (`shipment_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `shipment_exceptions_status_idx` ON `shipment_exceptions` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `shipment_exceptions_type_idx` ON `shipment_exceptions` (`exception_type`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ndr_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_exception_id` text NOT NULL,
	`action_type` text NOT NULL,
	`admin_id` text,
	`requested_at` integer DEFAULT (unixepoch()) NOT NULL,
	`provider_reference` text,
	`request_payload` text,
	`response_payload` text,
	`status` text DEFAULT 'REQUESTED' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shipment_exception_id`) REFERENCES `shipment_exceptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ndr_actions_exception_id_idx` ON `ndr_actions` (`shipment_exception_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ndr_actions_action_type_idx` ON `ndr_actions` (`action_type`);