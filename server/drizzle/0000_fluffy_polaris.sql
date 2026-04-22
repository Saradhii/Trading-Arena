CREATE TABLE `ai_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`agent_name` text NOT NULL,
	`parameters_count` text,
	`release_date` text,
	`parent_company` text,
	`cash_balance` real DEFAULT 100000 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_agents_agent_id_unique` ON `ai_agents` (`agent_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`asset_type` text NOT NULL,
	`current_price` real NOT NULL,
	`last_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_symbol_unique` ON `assets` (`symbol`);--> statement-breakpoint
CREATE TABLE `holdings` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`quantity` real NOT NULL,
	`average_buy_price` real NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `net_worth_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`session_id` text NOT NULL,
	`cash_balance` real NOT NULL,
	`portfolio_value` real NOT NULL,
	`net_worth` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`session_id` text NOT NULL,
	`order_type` text NOT NULL,
	`quantity` real NOT NULL,
	`price_at_order` real NOT NULL,
	`target_price` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`reasoning` text,
	`created_at` integer NOT NULL,
	`executed_at` integer,
	FOREIGN KEY (`agent_id`) REFERENCES `ai_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `trading_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trading_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_number` integer NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
