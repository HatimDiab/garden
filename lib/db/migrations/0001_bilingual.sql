ALTER TABLE `entries` ADD COLUMN `title_de` text;--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `body_json_de` text;--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `body_html_de` text;--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `excerpt_de` text;--> statement-breakpoint
ALTER TABLE `entries` ADD COLUMN `slug_de` text;--> statement-breakpoint
CREATE UNIQUE INDEX `entries_slug_de_unique` ON `entries` (`slug_de`) WHERE `slug_de` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `albums` ADD COLUMN `title_de` text;--> statement-breakpoint
ALTER TABLE `albums` ADD COLUMN `description_de` text;--> statement-breakpoint
ALTER TABLE `albums` ADD COLUMN `slug_de` text;--> statement-breakpoint
CREATE UNIQUE INDEX `albums_slug_de_unique` ON `albums` (`slug_de`) WHERE `slug_de` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `title_de` text;--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `description_de` text;--> statement-breakpoint
ALTER TABLE `images` ADD COLUMN `caption_de` text;--> statement-breakpoint
ALTER TABLE `tags` ADD COLUMN `name_de` text;--> statement-breakpoint
ALTER TABLE `tags` ADD COLUMN `slug_de` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_de_unique` ON `tags` (`slug_de`) WHERE `slug_de` IS NOT NULL;
