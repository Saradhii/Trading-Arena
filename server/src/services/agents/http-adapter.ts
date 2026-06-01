import type { AgentAdapter, AgentContext, AgentResult, Agent } from "./types";
import type { AdapterConfig } from "./index";
import { sanitizeActions } from "./validation";

export class HTTPAdapter implements AgentAdapter {
  readonly type = "http";

  constructor(
    private readonly agent: Agent,
    private readonly config: AdapterConfig,
  ) {}

  async decide(context: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    const endpoint = this.config.endpoint;
    if (!endpoint) {
      throw new Error(`HTTPAdapter for agent ${this.agent.id} is missing endpoint config`);
    }
    const timeoutMs = typeof this.config.timeoutMs === "number" ? this.config.timeoutMs : 20_000;
    const maxActions = typeof this.config.maxActions === "number" ? this.config.maxActions : 5;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let payload: unknown;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({ context }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`external agent ${endpoint} returned ${response.status}`);
      }
      payload = await response.json();
    } finally {
      clearTimeout(timer);
    }

    const body = (payload ?? {}) as Record<string, unknown>;
    const allowed = new Set(context.market.map((m) => m.symbol.toUpperCase()));
    const { actions, dropped } = sanitizeActions(body.actions, allowed, maxActions);

    return {
      actions,
      reasoning: typeof body.reasoning === "string" ? body.reasoning : null,
      providerUsed: "http",
      modelUsed: this.agent.model || hostOf(endpoint),
      tokensUsed: typeof body.tokensUsed === "number" ? body.tokensUsed : undefined,
      latencyMs: Date.now() - start,
      metadata: { endpoint: hostOf(endpoint), droppedActions: dropped.length },
    };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
