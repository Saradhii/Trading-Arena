-- Seed: 5 agents + 20 assets (10 crypto + 10 stocks)
-- Slug values become the agent PK.
INSERT INTO ai_agents (id, agent_name, parameters_count, release_date, parent_company, provider, model, cash_balance, created_at, updated_at) VALUES
  ('glm-5.1',         'GLM-5.1',         '744B MoE (40B active)', NULL, 'Z.ai',    'zai',      'glm-5.1',                                       100000, unixepoch(), unixepoch()),
  ('gpt-oss-120b',    'GPT-OSS-120B',    '120B',                  NULL, 'OpenAI',  'groq',     'openai/gpt-oss-120b',                           100000, unixepoch(), unixepoch()),
  ('gemini-3-flash',  'Gemini-3-Flash',  NULL,                    NULL, 'Google',  'google',   'gemini-flash-latest',                           100000, unixepoch(), unixepoch()),
  ('llama-4-scout',   'Llama-4-Scout',   '109B MoE',              NULL, 'Meta',    'groq',     'meta-llama/llama-4-scout-17b-16e-instruct',     100000, unixepoch(), unixepoch()),
  ('qwen-3-235b',     'Qwen-3-235B',     '235B MoE',              NULL, 'Alibaba', 'cerebras', 'qwen-3-235b-a22b-instruct-2507',                100000, unixepoch(), unixepoch());

INSERT INTO assets (id, symbol, name, asset_type, external_id, exchange, enabled, current_price) VALUES
  (lower(hex(randomblob(16))), 'ADA',  'Cardano',     'crypto', 'cardano',     NULL, 1, 0),
  (lower(hex(randomblob(16))), 'AVAX', 'Avalanche',   'crypto', 'avalanche-2', NULL, 1, 0),
  (lower(hex(randomblob(16))), 'BNB',  'BNB',         'crypto', 'binancecoin', NULL, 1, 0),
  (lower(hex(randomblob(16))), 'BTC',  'Bitcoin',     'crypto', 'bitcoin',     NULL, 1, 0),
  (lower(hex(randomblob(16))), 'DOGE', 'Dogecoin',    'crypto', 'dogecoin',    NULL, 1, 0),
  (lower(hex(randomblob(16))), 'ETH',  'Ethereum',    'crypto', 'ethereum',    NULL, 1, 0),
  (lower(hex(randomblob(16))), 'LINK', 'Chainlink',   'crypto', 'chainlink',   NULL, 1, 0),
  (lower(hex(randomblob(16))), 'SOL',  'Solana',      'crypto', 'solana',      NULL, 1, 0),
  (lower(hex(randomblob(16))), 'TRX',  'TRON',        'crypto', 'tron',        NULL, 1, 0),
  (lower(hex(randomblob(16))), 'XRP',  'XRP',         'crypto', 'ripple',      NULL, 1, 0),
  (lower(hex(randomblob(16))), 'AAPL', 'Apple Inc',         'stock', 'AAPL',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'AMZN', 'Amazon.com Inc',    'stock', 'AMZN',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'AVGO', 'Broadcom Inc',      'stock', 'AVGO',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'GOOGL','Alphabet Inc',      'stock', 'GOOGL', 'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'JPM',  'JPMorgan Chase',    'stock', 'JPM',   'NYSE',   1, 0),
  (lower(hex(randomblob(16))), 'LLY',  'Eli Lilly',         'stock', 'LLY',   'NYSE',   1, 0),
  (lower(hex(randomblob(16))), 'META', 'Meta Platforms',    'stock', 'META',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'MSFT', 'Microsoft Corp',    'stock', 'MSFT',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'NVDA', 'NVIDIA Corp',       'stock', 'NVDA',  'NASDAQ', 1, 0),
  (lower(hex(randomblob(16))), 'TSLA', 'Tesla Inc',         'stock', 'TSLA',  'NASDAQ', 1, 0);
