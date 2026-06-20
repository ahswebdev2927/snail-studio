CREATE TABLE `hero_banners` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`cta_text` text,
	`cta_link` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
