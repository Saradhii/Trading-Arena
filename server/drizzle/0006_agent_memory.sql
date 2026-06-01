CREATE TABLE `agent_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text,
	`memory_type` text NOT NULL,
	`content` text NOT NULL,
	`importance` real DEFAULT 0.5 NOT NULL,
	`session_number` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_memory_agent_idx` ON `agent_memory` (`agent_id`);--> statement-breakpoint
CREATE INDEX `agent_memory_agent_type_idx` ON `agent_memory` (`agent_id`,`memory_type`);--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `memory_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `strategy_persona` text;