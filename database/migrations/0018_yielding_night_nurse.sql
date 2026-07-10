ALTER TABLE `attribute_groups` ADD `show_in_dropdown` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `show_in_dropdown` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `show_in_dropdown` integer DEFAULT false NOT NULL;