INSERT OR IGNORE INTO ai_agents
  (id, agent_name, parameters_count, release_date, parent_company, provider, model, cash_balance, adapter_type, adapter_config, created_at, updated_at)
VALUES
  ('baseline-buy-hold',  'Baseline: Buy & Hold',     NULL, NULL, 'Trading Arena', 'algorithmic', 'buy_and_hold',  100000, 'algorithmic', '{"strategy":"buy_and_hold"}',   unixepoch(), unixepoch()),
  ('baseline-random',    'Baseline: Random',         NULL, NULL, 'Trading Arena', 'algorithmic', 'random',        100000, 'algorithmic', '{"strategy":"random"}',         unixepoch(), unixepoch()),
  ('baseline-momentum',  'Baseline: Momentum',       NULL, NULL, 'Trading Arena', 'algorithmic', 'momentum',      100000, 'algorithmic', '{"strategy":"momentum"}',       unixepoch(), unixepoch()),
  ('baseline-meanrev',   'Baseline: Mean Reversion', NULL, NULL, 'Trading Arena', 'algorithmic', 'mean_reversion',100000, 'algorithmic', '{"strategy":"mean_reversion"}', unixepoch(), unixepoch());
