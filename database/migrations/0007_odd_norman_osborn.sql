CREATE TABLE `search_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`results_count` integer DEFAULT 0 NOT NULL,
	`user_id` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `search_logs_query_idx` ON `search_logs` (`query`);--> statement-breakpoint
CREATE INDEX `search_logs_user_id_idx` ON `search_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `search_logs_created_at_idx` ON `search_logs` (`created_at`);