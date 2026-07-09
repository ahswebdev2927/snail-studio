ALTER TABLE `categories` ADD `show_on_homepage` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `show_on_homepage` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `sort_order` integer DEFAULT 0 NOT NULL;