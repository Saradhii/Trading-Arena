import { chatWithTools } from "../llm";
import { tradingTools } from "../llm/tools";
import type { LLMMessage, Env } from "../llm/types";
import type { AgentAdapter, AgentContext, AgentResult, AgentAction } from "./types";
import { buildSystemPrompt } from "./llm-adapter";

export interface PipelineStageConfig {

  agentId: string;
  role: "researcher" | "risk_manager" | "executor" | "reviewer";

  prompt: string;
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

export class PipelineAdapter implements AgentAdapter {
  readonly type = "pipeline";

  constructor(
    private readonly env: Env,
    private readonly stages: PipelineStageConfig[],
  ) {}

  async decide(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    if (this.stages.length === 0) {
      return {
        actions: [],
        reasoning: "Pipeline misconfigured: no stages.",
        providerUsed: "pipeline",
        modelUsed: "none",
        tokensUsed: 0,
        latencyMs: Date.now() - start,
      };
    }

    const systemPrompt = buildSystemPrompt(context);
    const transcript: string[] = [];
    let totalTokens = 0;
    const modelsUsed: string[] = [];

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const isFinal = i === this.stages.length - 1;

      const priorContext =
        transcript.length > 0
          ? `\n\n## Prior desk analysis\n${transcript.join("\n\n")}`
          : "";

      const messages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `You are the ${stage.role} on this trading desk. ${stage.prompt}${priorContext}`,
        },
      ];

      const response = await chatWithTools(
        this.env,
        stage.agentId,
        messages,
        isFinal ? tradingTools : [],
      );
      totalTokens += response.tokensUsed ?? 0;
      modelsUsed.push(response.modelUsed);
      if (response.content) transcript.push(`[${stage.role}] ${response.content}`);

      if (isFinal) {
        const actions: AgentAction[] = [];
        for (const call of response.toolCalls) {
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(call.function.arguments);
          } catch {
            continue;
          }
          const action = toAction(call.function.name, parsed);
          if (action) actions.push(action);
        }
        return {
          actions,
          reasoning: transcript.join("\n\n"),
          providerUsed: "pipeline",
          modelUsed: modelsUsed.join(" → "),
          tokensUsed: totalTokens,
          latencyMs: Date.now() - start,
          metadata: { stages: this.stages.map((s) => s.role) },
        };
      }
    }

    return {
      actions: [],
      reasoning: transcript.join("\n\n"),
      providerUsed: "pipeline",
      modelUsed: modelsUsed.join(" → "),
      tokensUsed: totalTokens,
      latencyMs: Date.now() - start,
    };
  }
}
