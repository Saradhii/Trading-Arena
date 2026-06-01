import type { Env } from "../llm/types";
import type { AgentAdapter, Agent } from "./types";
import { LLMAdapter } from "./llm-adapter";
import { AlgorithmicAdapter } from "./algorithmic-adapter";
import { HTTPAdapter } from "./http-adapter";
import { PipelineAdapter, type PipelineStageConfig } from "./pipeline-adapter";

export type { AgentAdapter, AgentContext, AgentAction, AgentResult } from "./types";
export { applyActions } from "./executor";
export { buildSystemPrompt } from "./llm-adapter";

export interface AdapterConfig {
  strategy?: string;
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxActions?: number;
  maxTurns?: number;
  maxTokens?: number;
  stages?: PipelineStageConfig[];
  [key: string]: unknown;
}

export function parseAdapterConfig(raw: string | null): AdapterConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as AdapterConfig) : {};
  } catch {
    return {};
  }
}

export function resolveAdapter(env: Env, agent: Agent): AgentAdapter {
  const config = parseAdapterConfig(agent.adapterConfig);
  switch (agent.adapterType) {
    case "algorithmic":
      return new AlgorithmicAdapter(agent, config.strategy ?? "buy_and_hold");
    case "http":
      return new HTTPAdapter(agent, config);
    case "pipeline":
      return new PipelineAdapter(env, config.stages ?? []);
    case "llm":
    default:
      return new LLMAdapter(env, agent, {
        maxTurns: config.maxTurns,
        maxTokens: config.maxTokens,
      });
  }
}
