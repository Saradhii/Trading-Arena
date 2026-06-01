CREATE TABLE `agent_ratings` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`rating` real DEFAULT 1200 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rating_history` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text NOT NULL,
	`rating_before` real NOT NULL,
	`rating_after` real NOT NULL,
	`rank_in_session` integer NOT NULL,
	`session_return` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rating_history_agent_idx` ON `rating_history` (`agent_id`);--> statement-breakpoint
CREATE INDEX `rating_history_session_idx` ON `rating_history` (`session_id`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_session` integer NOT NULL,
	`end_session` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `agent_decisions` ADD `confidence` real;