CREATE TABLE `size_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`thumb` integer NOT NULL,
	`index` integer NOT NULL,
	`middle` integer NOT NULL,
	`ring` integer NOT NULL,
	`pinky` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `size_profiles_name_unique` ON `size_profiles` (`name`);