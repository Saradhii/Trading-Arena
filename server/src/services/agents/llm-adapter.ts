import { chatWithTools } from "../llm";
import { tradingTools } from "../llm/tools";
import type { LLMMessage, LLMToolCall, Env } from "../llm/types";
import type { AgentAdapter, AgentContext, AgentResult, AgentAction, Agent } from "./types";
import { researchTools, isResearchTool, executeResearchTool } from "./research-tools";

export interface LLMAdapterOptions {

  maxTurns?: number;

  maxTokens?: number;
}

export function buildSystemPrompt(context: AgentContext): string {
  const { agentName, portfolio, market } = context;

  const holdingsStr =
    portfolio.holdings.length > 0
      ? portfolio.holdings
          .map(
            (h) =>
              `- ${h.symbol}: ${h.quantity} units @ avg $${h.averageBuyPrice.toFixed(2)} | current $${h.currentPrice.toFixed(2)} | P&L: $${h.pnl.toFixed(2)}`,
          )
          .join("\n")
      : "No holdings";

  const marketStr = market
    .map(
      (a) =>
        `- ${a.symbol} (${a.name}) [${a.assetType}]: $${a.currentPrice.toFixed(2)}`,
    )
    .join("\n");

  const personaSection = context.persona
    ? `\n## Your mandate: ${context.persona.name}\n${context.persona.promptAddendum}\n`
    : "";

  const memorySection = buildMemorySection(context);

  return `You are ${agentName}, a hedge fund portfolio manager. You manage capital across crypto and equities markets. Your role is to allocate capital where you see asymmetric risk-adjusted return — and just as importantly, to refrain when the data does not support a thesis.
${personaSection}
## Your Portfolio
- Cash: $${portfolio.cashBalance.toFixed(2)}
- Portfolio Value: $${portfolio.portfolioValue.toFixed(2)}
- Net Worth: $${portfolio.netWorth.toFixed(2)}

### Current Holdings
${holdingsStr}

## Available Market
${marketStr}
${memorySection}
## Available Actions
- market_buy(assetSymbol, quantity, reasoning) — open or grow a position
- market_sell(assetSymbol, quantity, reasoning) — close or reduce a position
- Hold by taking no action — no tool call means no trade this session

## Your discipline
- Holding is a legitimate, often correct decision. Strong managers protect capital when no clear edge exists; they do not force trades.
- Trade only when your analysis identifies a clear thesis that justifies the risk and position size.
- You may make up to 2 trades this session, or zero if you see no edge.
- When you trade, your reasoning should reflect actual market analysis — your read on the asset, the position, and why now — not generic risk-management filler.

## Required output (read carefully)
You MUST always return a text message (2–4 sentences) describing your market read and the decision you are taking this session. This is non-negotiable — the text is your audit trail and is reviewed weeks later to evaluate your judgment.

- **If you hold:** return only the text message, no tool calls. The text must explain *why* you are holding.
- **If you trade:** in the SAME response, return BOTH the text message AND the market_buy / market_sell tool call(s). The assistant message must contain a non-empty content field with your thesis (what you see, why now, what the trade expresses) in addition to the tool_calls field. An empty/null content with tool calls is a malformed response.

Even when you call tools, write your prose first, then issue the tool calls.`;
}

function buildMemorySection(context: AgentContext): string {
  if (!context.memory) return "";
  const { reflections, lessons } = context.memory;
  if (reflections.length === 0 && lessons.length === 0) return "";

  const lessonsStr =
    lessons.length > 0
      ? `### Key lessons you've learned\n${lessons.map((l) => `- ${l}`).join("\n")}\n`
      : "";
  const reflectionsStr =
    reflections.length > 0
      ? `### Your recent reflections\n${reflections
          .map((r) => `- Session ${r.sessionNumber}: ${r.content}`)
          .join("\n")}\n`
      : "";

  return `\n## Your memory (what you've learned across past sessions)\n${lessonsStr}${reflectionsStr}`;
}

function toAction(name: string, args: Record<string, unknown>): AgentAction | null {
  if (name !== "market_buy" && name !== "market_sell") return null;
  const symbol = typeof args.assetSymbol === "string" ? args.assetSymbol : undefined;
  const quantity = typeof args.quantity === "number" ? args.quantity : undefined;
  if (!symbol || quantity === undefined) return null;
  return {
    type: name,
    symbol,
    quantity,
    reasoning: typeof args.reasoning === "string" ? args.reasoning : "",
    confidence: typeof args.confidence === "number" ? args.confidence : undefined,
  };
}

function tradeCallsToActions(calls: LLMToolCall[]): AgentAction[] {
  const actions: AgentAction[] = [];
  for (const call of calls) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      continue;
    }
    const action = toAction(call.function.name, parsed);
    if (action) actions.push(action);
  }
  return actions;
}

export class LLMAdapter implements AgentAdapter {
  readonly type = "llm";

  constructor(
    private readonly env: Env,
    private readonly agent: Agent,
    private readonly options: LLMAdapterOptions = {},
  ) {}

  async decide(context: AgentContext): Promise<AgentResult> {
    const maxTurns = this.options.maxTurns ?? 1;
    return maxTurns > 1 ? this.decideMultiTurn(context, maxTurns) : this.decideSingle(context);
  }

  private async decideSingle(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const messages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt(context) },
      {
        role: "user",
        content:
          "Review the portfolio and market. Always include a short text rationale describing your decision (trade or hold). Trade only if you see a thesis that justifies the risk; otherwise hold.",
      },
    ];

    const response = await chatWithTools(this.env, this.agent.id, messages, tradingTools);

    return {
      actions: tradeCallsToActions(response.toolCalls),
      reasoning: response.content ?? null,
      providerUsed: response.providerUsed,
      modelUsed: response.modelUsed,
      tokensUsed: response.tokensUsed,
      latencyMs: Date.now() - start,
    };
  }

  private async decideMultiTurn(context: AgentContext, maxTurns: number): Promise<AgentResult> {
    const start = Date.now();
    const maxTokens = this.options.maxTokens ?? 8000;

    const messages: LLMMessage[] = [
      { role: "system", content: buildSystemPrompt(context) },
      {
        role: "user",
        content:
          "You may research using the available read-only tools (price history, indicators, correlation) before deciding. When ready, either issue market_buy/market_sell calls with a written thesis, or hold with a written rationale. Hold if you find no edge.",
      },
    ];

    let totalTokens = 0;
    let reasoning: string | null = null;
    let providerUsed = this.agent.provider;
    let modelUsed = this.agent.model;
    let turnsTaken = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
      turnsTaken = turn + 1;

      const isFinal = turn === maxTurns - 1 || totalTokens >= maxTokens;
      const turnTools = isFinal ? tradingTools : [...researchTools, ...tradingTools];

      const response = await chatWithTools(this.env, this.agent.id, messages, turnTools);
      totalTokens += response.tokensUsed ?? 0;
      providerUsed = response.providerUsed;
      modelUsed = response.modelUsed;
      if (response.content) reasoning = response.content;

      messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
      });

      const tradeCalls = response.toolCalls.filter((c) => !isResearchTool(c.function.name));
      const researchCalls = response.toolCalls.filter((c) => isResearchTool(c.function.name));

      if (tradeCalls.length > 0 || response.toolCalls.length === 0 || isFinal) {
        return {
          actions: tradeCallsToActions(tradeCalls),
          reasoning,
          providerUsed,
          modelUsed,
          tokensUsed: totalTokens,
          latencyMs: Date.now() - start,
          metadata: { turns: turnsTaken, mode: "react" },
        };
      }

      for (const call of researchCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {

        }
        const result = executeResearchTool(call.function.name, args, context);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return {
      actions: [],
      reasoning,
      providerUsed,
      modelUsed,
      tokensUsed: totalTokens,
      latencyMs: Date.now() - start,
      metadata: { turns: turnsTaken, mode: "react" },
    };
  }
}
