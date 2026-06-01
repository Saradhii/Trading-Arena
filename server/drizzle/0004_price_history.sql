CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`symbol` text NOT NULL,
	`price` real NOT NULL,
	`session_id` text,
	`recorded_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `price_history_asset_idx` ON `price_history` (`asset_id`);--> statement-breakpoint
CREATE INDEX `price_history_asset_recorded_idx` ON `price_history` (`asset_id`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `price_history_session_idx` ON `price_history` (`session_id`);