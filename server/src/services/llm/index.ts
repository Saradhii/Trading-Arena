import type { LLMMessage, LLMResponse, LLMToolDef, Env, ProviderHealth } from "./types";
import { RateLimitError } from "./types";
import { BaseLLMProvider } from "./providers/base";
import { GroqProvider } from "./providers/groq";
import { CerebrasProvider } from "./providers/cerebras";
import { OpenRouterProvider } from "./providers/openrouter";
import { ZaiProvider } from "./providers/zai";
import { GoogleProvider } from "./providers/google";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { aiAgents } from "../../db/schema";

const PROVIDER_MAP: Record<string, BaseLLMProvider> = {
  groq: new GroqProvider(),
  cerebras: new CerebrasProvider(),
  openrouter: new OpenRouterProvider(),
  zai: new ZaiProvider(),
  google: new GoogleProvider(),
};

const API_KEY_MAP: Record<string, keyof Env> = {
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  zai: "ZAI_API_KEY",
  google: "GOOGLE_API_KEY",
};

const healthCache = new Map<string, ProviderHealth>();
const CACHE_TTL = 5 * 60 * 60 * 1000;

function getProviderHealth(providerName: string): ProviderHealth | undefined {
  const cached = healthCache.get(providerName);
  if (!cached) return undefined;
  if (Date.now() > cached.lastChecked + CACHE_TTL) {
    healthCache.delete(providerName);
    return undefined;
  }
  if (cached.cooldownUntil && Date.now() < cached.cooldownUntil) {
    return cached;
  }
  if (cached.cooldownUntil && Date.now() >= cached.cooldownUntil) {
    cached.healthy = true;
    cached.cooldownUntil = 0;
  }
  return cached;
}

function updateHealthFromResponse(providerName: string, rateLimitRemaining?: number) {
  const existing = healthCache.get(providerName);
  healthCache.set(providerName, {
    name: providerName,
    healthy: true,
    lastChecked: Date.now(),
    cooldownUntil: 0,
    rateLimitRemaining,
  });
  if (existing?.cooldownUntil) {
    existing.cooldownUntil = 0;
  }
}

export async function chatWithTools(
  env: Env,
  agentId: string,
  messages: LLMMessage[],
  tools: LLMToolDef[],
): Promise<LLMResponse> {
  const db = createDb(env.DB);

  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const providerName = agent.provider;
  const model = agent.model;

  const provider = PROVIDER_MAP[providerName];
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  const apiKeyKey = API_KEY_MAP[providerName];
  const apiKey = env[apiKeyKey] as string;
  if (!apiKey) throw new Error(`Missing API key for ${providerName}`);

  const health = getProviderHealth(providerName);
  if (health && !health.healthy) {
    throw new RateLimitError(providerName);
  }

  const response = await provider.chatWithTools(apiKey, model, messages, tools);
  updateHealthFromResponse(providerName, response.rateLimitRemaining);
  return response;
}
