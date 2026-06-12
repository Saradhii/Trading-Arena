interface AgentLike {
  provider?: string | null
  agentName?: string | null
}

// Algorithmic baseline bots (Baseline: Buy & Hold, Random, …) live in the
// production DB alongside the LLM agents; the arena UI only shows the latter.
export function isBaselineAgent(a: AgentLike): boolean {
  return a.provider === "algorithmic" || (a.agentName ?? "").startsWith("Baseline:")
}

export function excludeBaselineAgents<T extends AgentLike>(list: T[]): T[] {
  return list.filter((a) => !isBaselineAgent(a))
}
