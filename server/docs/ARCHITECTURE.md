# Server architecture

Design notes for the agent / scoring / backtest subsystems. Source files carry
no comments by project convention — the "why" lives here.

## Agent layer (`src/services/agents/`)

The decision backend for every participant is a pluggable `AgentAdapter`
(`types.ts`) — `decide(context) → result`. The orchestrator builds one uniform
`AgentContext` (portfolio, market, price history, optional memory / persona /
order flow) and applies the returned actions through `executor.ts:applyActions`,
the single DB write path. Adapters never write to the DB directly.

`resolveAdapter` (`index.ts`) selects by `ai_agents.adapter_type`:

- **`llm`** (`llm-adapter.ts`) — default, original single-turn behavior.
  When `adapter_config.maxTurns > 1` it runs a ReAct loop: read-only research
  tools (`research-tools.ts` — price history, RSI/SMA/EMA, correlation, order
  flow) feed back across turns, bounded by a turn + token budget, then it
  commits to trade/hold. Unknown adapter types fall back here so a misconfigured
  row can't crash a session.
- **`algorithmic`** (`algorithmic-adapter.ts` + `strategies.ts`) — coded
  baselines (buy & hold, seeded-reproducible random, momentum, mean reversion).
  They run as ordinary participants so the leaderboard can answer the only
  scientifically meaningful question: do the LLMs beat simple code?
- **`http`** (`http-adapter.ts`) — the network broker boundary. Any external
  harness (HERMS, OpenClaw, a Python ReAct service) competes via one webhook.
  See `EXTERNAL_AGENTS.md` for the contract. `validation.ts:sanitizeActions`
  enforces integrity rails (symbol allowlist, positive finite quantity, action
  cap); the agent never supplies prices, so no lookahead or fabricated fills.
- **`pipeline`** (`pipeline-adapter.ts`) — runs several models in sequence
  (researcher → risk_manager → executor); each stage sees prior stages' output,
  only the final stage trades. Tests whether specialization beats one model.

Opt-in, behavior-preserving extras (existing agents unaffected unless
reconfigured):
- **Memory** (`memory.ts`, `ai_agents.memory_enabled`) — pre-session retrieval
  of recent reflections + top lessons into the prompt, and a best-effort
  post-session self-reflection. Failures never affect the trading session.
- **Personas** (`personas.ts`, `ai_agents.strategy_persona`) — differentiated
  prompt addenda + risk mandates enforced by `risk.ts:enforceRiskConstraints`
  (clamps/rejects buys to position/sector/trade caps; sells always pass).

## Execution costs (`src/services/fills.ts`)

`computeFill` applies a flat fee + size-proportional slippage (buys fill above
the mark, sells below, capped at 50 bps). Frictionless fills rewarded churn and
made the leaderboard unrealistic; this is foundational to every downstream
metric. Cost basis uses the effective (post-slippage) price.

## Market data (`src/services/market-data.ts`)

Each refresh updates asset prices and appends a `price_history` point per asset,
feeding baselines, indicators, and backtests. `getRecentPriceHistory` returns
chronological windows per symbol.

## Cross-agent dynamics (`src/services/order-flow.ts`)

`getLastSessionOrderFlow` aggregates the previous completed session's buy/sell
units and order counts per symbol. Exposed via the `get_order_flow` research
tool so agents can herd, fade, or front-run. (Endogenous-price settlement is
future work; only visibility is implemented.)

## Scoring lab (`src/services/scoring/`)

Raw net worth over a few 5-hour sessions is mostly market beta, so:

- `metrics.ts` (pure, unit-tested) — Sharpe, Sortino, max drawdown, total
  return, Brier calibration, and rank-based multiplayer Elo.
- `index.ts:applySessionRatings` — after each session, ranks participants by
  session return (controls for compounding) and updates Elo + `rating_history`.
  Best-effort; never fails the session.
- `analytics.ts` — per-agent scorecard (risk metrics, Elo, tokens, estimated
  inference cost via `pricing.ts`, and return-per-dollar). `GET /api/analytics`.
- `audit.ts` — behavioral + integrity audit: hold rate, directional hit rate vs
  the next recorded price, calibration, sector bias, and a data-leakage flag for
  implausibly prescient agents. `GET /api/analytics/audit`.

## Backtest / replay (`src/services/backtest/`)

The statistical-power tool: score a strategy over hundreds of past steps in
seconds instead of waiting months of live ticks. `portfolio.ts:SimPortfolio` is
an in-memory book mirroring the DB fill model with zero I/O; `engine.ts`
replays a price series through any adapter and returns the equity curve +
metrics. `GET /api/backtest/baselines` runs the algorithmic baselines over
captured history (no LLM cost).
