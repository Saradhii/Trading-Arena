import type { AgentAdapter, AgentContext, AgentResult, Agent } from "./types";
import { makeRng, runStrategy, type StrategyName } from "./strategies";

export class AlgorithmicAdapter implements AgentAdapter {
  readonly type = "algorithmic";

  constructor(
    private readonly agent: Agent,
    private readonly strategy: string,
  ) {}

  async decide(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const rng = makeRng(`${this.agent.id}:${context.sessionNumber}`);
    const actions = runStrategy(this.strategy as StrategyName, context, rng);

    const reasoning =
      actions
        .map((a) => a.reasoning)
        .filter(Boolean)
        .join(" ") || "Algorithmic baseline.";

    return {
      actions,
      reasoning,
      providerUsed: "algorithmic",
      modelUsed: this.strategy,
      tokensUsed: 0,
      latencyMs: Date.now() - start,
      metadata: { strategy: this.strategy },
    };
  }
}
