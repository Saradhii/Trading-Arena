# Trading Arena — Reconciled Roadmap (Single Source of Truth)

This document reconciles two independent analyses of Trading Arena into one execution
plan. It **supersedes** `ARCHITECTURE_AND_ROADMAP.md` (kept for provenance).

## Corrections applied to the prior roadmap

1. **Cron cadence.** `wrangler.jsonc` is `"0 */5 * * *"` = **every 5 hours**, not every
   5 minutes. Consequence: ~5 decisions/day, stock legs often land on closed markets
   (Finnhub last price). Data is *starved*, not abundant → **backtest/replay is elevated**
   in priority, and the live leaderboard is too noisy to trust without risk-adjustment.
2. **The in-process `AgentAdapter` is necessary but not sufficient** for the headline
   goal ("plug in HERMS / OpenClaw / external harnesses"). A `decide()` function runs
   *inside* the Worker; an external Python ReAct harness cannot. The adapter and a
   **network broker boundary** (`HTTPAdapter` + integrity rails) are *complementary
   layers*, not alternatives. One `AgentAdapter` implementation simply calls the external
   webhook.
3. **Fills-friction must precede scoring.** Frictionless fills (instant fill at
   `currentPrice`, no fee/spread/slippage) corrupt every downstream metric and reward
   churn. A minimal fee + size-based slippage model is foundational, not P2.
4. **Backtest/replay added** (absent from the prior plan) — the highest-leverage way to
   get statistical signal given the real cadence.
5. **Richer scoring added** — Elo alone inherits market beta. Add Sharpe/Sortino/max
   drawdown, **calibration (Brier on the agent's own stated confidence)**, and
   **return-per-dollar-of-inference** (tokens are already logged).

## Governing principles

- **Additive & behavior-preserving.** The current 6 LLM agents keep behaving exactly as
  today (`adapter_type='llm'`, single-turn, no memory) until reconfigured. Every new
  capability is opt-in via agent config columns or an explicit mode.
- **The server is the only writer.** External participants touch the world only through a
  validated action contract (integrity rails: snapshot pinning, symbol allowlist,
  deadline, idempotency).
- **Pure logic is unit-tested.** Slippage, indicators, Elo, risk metrics, calibration,
  baselines — all covered by `bun test`. LLM calls are not exercised live (no keys / cost).

## Build order

### Phase 0 — Foundation (behavior-preserving refactor + scientific validity)
- **0.1 `AgentAdapter` abstraction.** Introduce `services/agents/`. Refactor the existing
  LLM flow into `LLMAdapter` with zero behavior change. Schema:
  `ai_agents.adapter_type` (default `'llm'`), `ai_agents.adapter_config` (JSON).
- **0.2 Price history capture.** `price_history` table populated on each refresh. Enables
  baselines, indicators, replay.
- **0.3 Realistic fills.** Fee + linear size-based slippage at execution; record
  `effective_price`, `fee_paid`, `slippage_bps` on `orders`.
- **0.4 Algorithmic baselines.** `AlgorithmicAdapter`: buy_and_hold, random (seeded
  deterministic), momentum, mean_reversion. Seeded as control agents.

### Phase 1 — External harnesses + integrity (the headline)
- **1.1 `HTTPAdapter` + integrity rails.** Calls an external endpoint with `AgentContext`,
  validates `AgentResult`, enforces timeout/deadline, symbol allowlist, and snapshot
  pinning. This is the boundary that lets HERMS/OpenClaw/any harness compete fairly.

### Phase 2 — Memory & differentiation
- **2.1 Persistent memory + reflection.** `agent_memory` table; pre-session retrieval into
  the prompt; post-session reflection call. Gated by `memory_enabled`.
- **2.2 Strategy personas.** Differentiated prompts + enforced risk constraints
  (max position %, max sector %, max trades/session). Same model, different strategy.

### Phase 3 — Reasoning & scoring (the lab)
- **3.1 Multi-turn ReAct loop.** Research tools (price history, indicators, correlation);
  turn + token budget. Opt-in via agent config.
- **3.2 Scoring lab.** Elo + risk-adjusted metrics (Sharpe/Sortino/max drawdown/win rate)
  + calibration (Brier) + cost/decision. Tables: `agent_ratings`, `rating_history`,
  `seasons`. Exposed via routes.
- **3.3 Auditing / anomaly detection.** Behavioral metrics + next-session lookahead
  (data-leakage) flagging.

### Phase 4 — Advanced / heavy
- **4.1 Market-impact phase execution.** Collect→settle with cross-agent slippage;
  `get_order_flow` tool. Opt-in arena mode.
- **4.2 Agent pipelines.** Composite `PipelineAdapter` (researcher → risk → executor).
- **4.3 Backtest / replay.** Replay historical price windows for statistical power.
- **4.4 Real-time streaming.** Durable Objects + WebSocket. Implemented if low-risk,
  else a documented stub.

## Verification strategy (this run)

- `tsc --noEmit` after every phase.
- `drizzle-kit generate` + local D1 migration apply for every schema change.
- `bun test` for all pure logic.
- **Not** exercised live: provider LLM calls (no API keys; avoid cost). Live behavior is
  preserved by construction and noted where it cannot be machine-verified here.

## Implementation status (branch `feature/autonomous-agent-arena`)

| Item | Status | Verified by |
|------|--------|-------------|
| 0.1 AgentAdapter abstraction | ✅ done | typecheck |
| 0.2 Price history capture | ✅ done | typecheck + migration |
| 0.3 Realistic fills | ✅ done | unit tests + migration |
| 0.4 Algorithmic baselines | ✅ done | unit tests + seed |
| 1.1 HTTPAdapter + integrity rails | ✅ done | unit tests + docs |
| 2.1 Memory + reflection (opt-in) | ✅ done | typecheck + migration |
| 2.2 Strategy personas + risk caps | ✅ done | unit tests |
| 3.1 Multi-turn ReAct + research tools | ✅ done | unit tests |
| 3.2 Elo + risk-adjusted + cost scoring | ✅ done | unit tests + migration + live smoke |
| 3.3 Audit / anomaly detection | ✅ done | unit tests + live smoke |
| 4.1 Cross-agent order-flow tool | ✅ done | unit tests |
| 4.2 Composable pipelines | ✅ done | typecheck |
| 4.3 Backtest / replay | ✅ done | integration test + route |
| 4.4 Real-time streaming (Durable Objects) | ⏸ deferred | — |
| 4.1b Endogenous-price settlement | ⏸ deferred | — |

**Live smoke test:** the worker boots locally and `/api/analytics`,
`/api/analytics/audit`, and `/api/backtest/baselines` all serve correct data
from the existing local DB (no LLM calls needed for these paths).

### Deliberately deferred (with rationale)

- **4.4 Real-time streaming (Durable Objects + WebSocket).** Requires a
  Durable Object migration in `wrangler.jsonc` and a live edge runtime to
  verify; shipping it unverified risks breaking deploy. Best done as its own
  focused change once the agent engine is reviewed. The building blocks
  (session orchestration, per-agent results) are already structured to emit
  progress events.
- **Endogenous-price collect-then-settle market.** The order-flow *visibility*
  half is shipped (4.1). Making agents' orders move a simulated price (true
  game-theoretic arena) changes core settlement semantics and warrants its own
  design pass + simulation tests, rather than being bundled here.

### Not in scope this pass

- **Client/dashboard UI** for the new `/api/analytics` and `/api/backtest`
  endpoints. The APIs are live and shaped for direct consumption; wiring the
  Next.js dashboard is a follow-up.
