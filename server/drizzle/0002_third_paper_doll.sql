CREATE INDEX `holdings_agent_asset_idx` ON `holdings` (`agent_id`,`asset_id`);--> statement-breakpoint
CREATE INDEX `net_worth_snapshots_agent_idx` ON `net_worth_snapshots` (`agent_id`);--> statement-breakpoint
CREATE INDEX `orders_agent_idx` ON `orders` (`agent_id`);--> statement-breakpoint
CREATE INDEX `orders_asset_idx` ON `orders` (`asset_id`);--> statement-breakpoint
CREATE INDEX `orders_session_idx` ON `orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `session_logs_session_idx` ON `session_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_logs_created_at_idx` ON `session_logs` (`created_at`);