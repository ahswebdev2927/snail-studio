CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`admin_name` text NOT NULL,
	`action` text NOT NULL,
	`target_user_id` text,
	`previous_role` text,
	`new_role` text,
	`ip_address` text,
	`browser` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL,
	`verification_method` text DEFAULT 'email_otp' NOT NULL,
	`verification_status` text NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_admin_id_idx` ON `admin_audit_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_logs_timestamp_idx` ON `admin_audit_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `security_otps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`otp` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `security_otps_user_id_idx` ON `security_otps` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `is_store_owner` integer DEFAULT false NOT NULL;