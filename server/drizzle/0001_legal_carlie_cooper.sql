CREATE TABLE `llm_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`priority` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_health_check` integer,
	`is_healthy` integer DEFAULT true NOT NULL,
	`rate_limit_remaining` integer,
	`cooldown_until` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_providers_name_unique` ON `llm_providers` (`name`);--> statement-breakpoint
CREATE TABLE `session_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text,
	`agent_id` text,
	`provider_used` text NOT NULL,
	`model_used` text NOT NULL,
	`status` text NOT NULL,
	`failure_reason` text,
	`tool_calls_made` integer DEFAULT 0,
	`tokens_used` integer,
	`latency_ms` integer,
	`rate_limit_remaining` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `provider` text NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `model` text NOT NULL;