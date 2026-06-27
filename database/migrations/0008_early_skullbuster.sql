CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`icon` text,
	`cta_text` text,
	`cta_link` text,
	`text_color` text DEFAULT '#ffffff' NOT NULL,
	`background_color` text DEFAULT '#0b0f19' NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
