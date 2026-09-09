ALTER TABLE `return_requests` ADD COLUMN `paid_at` integer;--> statement-breakpoint
ALTER TABLE `return_requests` ADD COLUMN `recorded_by` text REFERENCES `users`(`id`) ON DELETE set null;
