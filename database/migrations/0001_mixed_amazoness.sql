ALTER TABLE `media` ADD `resource_type` text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE `media` ADD `duration` integer;--> statement-breakpoint
ALTER TABLE `media` ADD `folder` text;--> statement-breakpoint
ALTER TABLE `media` ADD `alt_text` text;--> statement-breakpoint
ALTER TABLE `media` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;