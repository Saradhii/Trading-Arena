ALTER TABLE `ai_agents` ADD `adapter_type` text DEFAULT 'llm' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_agents` ADD `adapter_config` text;