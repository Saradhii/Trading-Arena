CREATE TABLE `cryptos` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`external_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cryptos_symbol_unique` ON `cryptos` (`symbol`);--> statement-breakpoint
CREATE UNIQUE INDEX `cryptos_external_id_unique` ON `cryptos` (`external_id`);--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`external_id` text NOT NULL,
	`exchange` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stocks_symbol_unique` ON `stocks` (`symbol`);--> statement-breakpoint
CREATE UNIQUE INDEX `stocks_external_id_unique` ON `stocks` (`external_id`);--> statement-breakpoint
INSERT INTO `cryptos` (`id`, `symbol`, `name`, `external_id`, `enabled`, `created_at`) VALUES
  ('crypto-btc',  'BTC',  'Bitcoin',    'bitcoin',       1, unixepoch()),
  ('crypto-eth',  'ETH',  'Ethereum',   'ethereum',      1, unixepoch()),
  ('crypto-bnb',  'BNB',  'BNB',        'binancecoin',   1, unixepoch()),
  ('crypto-sol',  'SOL',  'Solana',     'solana',        1, unixepoch()),
  ('crypto-xrp',  'XRP',  'XRP',        'ripple',        1, unixepoch()),
  ('crypto-doge', 'DOGE', 'Dogecoin',   'dogecoin',      1, unixepoch()),
  ('crypto-ada',  'ADA',  'Cardano',    'cardano',       1, unixepoch()),
  ('crypto-trx',  'TRX',  'TRON',       'tron',          1, unixepoch()),
  ('crypto-avax', 'AVAX', 'Avalanche',  'avalanche-2',   1, unixepoch()),
  ('crypto-link', 'LINK', 'Chainlink',  'chainlink',     1, unixepoch());--> statement-breakpoint
INSERT INTO `stocks` (`id`, `symbol`, `name`, `external_id`, `exchange`, `enabled`, `created_at`) VALUES
  ('stock-nvda',  'NVDA',  'NVIDIA Corp',     'NVDA',  'NASDAQ', 1, unixepoch()),
  ('stock-msft',  'MSFT',  'Microsoft Corp',  'MSFT',  'NASDAQ', 1, unixepoch()),
  ('stock-aapl',  'AAPL',  'Apple Inc',       'AAPL',  'NASDAQ', 1, unixepoch()),
  ('stock-googl', 'GOOGL', 'Alphabet Inc',    'GOOGL', 'NASDAQ', 1, unixepoch()),
  ('stock-amzn',  'AMZN',  'Amazon.com Inc',  'AMZN',  'NASDAQ', 1, unixepoch()),
  ('stock-meta',  'META',  'Meta Platforms',  'META',  'NASDAQ', 1, unixepoch()),
  ('stock-avgo',  'AVGO',  'Broadcom Inc',    'AVGO',  'NASDAQ', 1, unixepoch()),
  ('stock-tsla',  'TSLA',  'Tesla Inc',       'TSLA',  'NASDAQ', 1, unixepoch()),
  ('stock-jpm',   'JPM',   'JPMorgan Chase',  'JPM',   'NYSE',   1, unixepoch()),
  ('stock-lly',   'LLY',   'Eli Lilly',       'LLY',   'NYSE',   1, unixepoch());