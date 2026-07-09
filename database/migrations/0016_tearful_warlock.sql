PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`icon` text,
	`cta_text` text,
	`cta_link` text,
	`text_color` text DEFAULT '#ffffff' NOT NULL,
	`background_color` text DEFAULT '#A85328' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_announcements`("id", "text", "icon", "cta_text", "cta_link", "text_color", "background_color", "start_date", "end_date", "is_active", "sort_order", "created_at", "updated_at") SELECT "id", "text", "icon", "cta_text", "cta_link", "text_color", "background_color", "start_date", "end_date", "is_active", "sort_order", "created_at", "updated_at" FROM `announcements`;--> statement-breakpoint
DROP TABLE `announcements`;--> statement-breakpoint
ALTER TABLE `__new_announcements` RENAME TO `announcements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `hero_banners` ADD `text_color` text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE `hero_banners` ADD `content_alignment` text DEFAULT 'center' NOT NULL;--> statement-breakpoint
ALTER TABLE `hero_banners` ADD `line_spacing` text DEFAULT 'normal' NOT NULL;