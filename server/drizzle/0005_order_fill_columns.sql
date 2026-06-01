ALTER TABLE `orders` ADD `effective_price` real;--> statement-breakpoint
ALTER TABLE `orders` ADD `fee_paid` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `orders` ADD `slippage_bps` real DEFAULT 0;