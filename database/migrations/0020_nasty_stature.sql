CREATE TABLE `email_marketing_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`newsletter` integer DEFAULT true NOT NULL,
	`promotions` integer DEFAULT true NOT NULL,
	`launch_notifications` integer DEFAULT true NOT NULL,
	`back_in_stock` integer DEFAULT true NOT NULL,
	`product_updates` integer DEFAULT true NOT NULL,
	`price_drops` integer DEFAULT true NOT NULL,
	`unsubscribed_all` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_marketing_preferences_email_unique` ON `email_marketing_preferences` (`email`);--> statement-breakpoint
CREATE INDEX `pref_email_idx` ON `email_marketing_preferences` (`email`);--> statement-breakpoint
CREATE INDEX `pref_user_id_idx` ON `email_marketing_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `launch_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`background_image` text,
	`product_image` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `launch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`event_type` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `launch_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`product_id` text,
	`sent_7_day_reminder` integer DEFAULT false NOT NULL,
	`sent_3_day_reminder` integer DEFAULT false NOT NULL,
	`sent_1_day_reminder` integer DEFAULT false NOT NULL,
	`sent_launch_day_reminder` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `launch_subscribers_email_product_unique` ON `launch_subscribers` (`email`,`product_id`);--> statement-breakpoint
CREATE TABLE `marketing_campaign_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`resend_message_id` text,
	`status` text DEFAULT 'sent' NOT NULL,
	`revenue` integer DEFAULT 0 NOT NULL,
	`opened_at` integer,
	`clicked_at` integer,
	`bounced_at` integer,
	`unsubscribed_at` integer,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `delivery_campaign_id_idx` ON `marketing_campaign_deliveries` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `delivery_email_idx` ON `marketing_campaign_deliveries` (`email`);--> statement-breakpoint
CREATE INDEX `delivery_resend_id_idx` ON `marketing_campaign_deliveries` (`resend_message_id`);--> statement-breakpoint
CREATE TABLE `marketing_campaign_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`recipients_count` integer DEFAULT 0 NOT NULL,
	`sent_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`revenue` integer DEFAULT 0 NOT NULL,
	`ctr` integer DEFAULT 0 NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `run_campaign_id_idx` ON `marketing_campaign_runs` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `marketing_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`campaign_type` text NOT NULL,
	`segment_type` text NOT NULL,
	`segment_details` text,
	`template_name` text NOT NULL,
	`body_html` text NOT NULL,
	`body_json` text,
	`coupon_id` text,
	`featured_product_ids` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `marketing_recipient_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`run_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `marketing_campaign_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `snapshot_campaign_id_idx` ON `marketing_recipient_snapshots` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `snapshot_run_id_idx` ON `marketing_recipient_snapshots` (`run_id`);--> statement-breakpoint
CREATE INDEX `snapshot_email_idx` ON `marketing_recipient_snapshots` (`email`);--> statement-breakpoint
CREATE TABLE `marketing_suppressions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppression_email_unique_idx` ON `marketing_suppressions` (`email`);--> statement-breakpoint
ALTER TABLE `products` ADD `launch_date` text;--> statement-breakpoint
ALTER TABLE `products` ADD `launch_time` text;--> statement-breakpoint
ALTER TABLE `products` ADD `launch_time_zone` text DEFAULT 'Asia/Kolkata';--> statement-breakpoint
ALTER TABLE `products` ADD `auto_publish` integer DEFAULT false NOT NULL;