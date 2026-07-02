ALTER TABLE `attribute_groups` ADD `attributeType` text DEFAULT 'VARIANT' NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `variantAxis` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `filterable` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `searchable` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `visibleOnPdp` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `comparable` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `attribute_groups` ADD `displayOrder` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `attribute_groups`
SET `attributeType` = 'CATALOG', `variantAxis` = 0
WHERE lower(`name`) IN ('style', 'occasion', 'finish', 'collection', 'season', 'colour', 'texture', 'color');