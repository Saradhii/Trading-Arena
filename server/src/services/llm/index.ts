import type { LLMMessage, LLMResponse, LLMToolDef, Env, ProviderHealth } from "./types";
import { RateLimitError } from "./types";
import { BaseLLMProvider } from "./providers/base";
import { GroqProvider } from "./providers/groq";
import { CerebrasProvider } from "./providers/cerebras";
import { OpenRouterProvider } from "./providers/openrouter";
import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { aiAgents, llmProviders } from "../../db/schema";

const PROVIDER_MAP: Record<string, BaseLLMProvider> = {
  groq: new GroqProvider(),
  cerebras: new CerebrasProvider(),
  openrouter: new OpenRouterProvider(),
};

const API_KEY_MAP: Record<string, keyof Env> = {
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
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

function setProviderUnhealthy(providerName: string, cooldownMs: number) {
  const existing = healthCache.get(providerName);
  healthCache.set(providerName, {
    name: providerName,
    healthy: false,
    lastChecked: existing?.lastChecked ?? Date.now(),
    cooldownUntil: Date.now() + cooldownMs,
  });
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

export async function runHealthChecks(env: Env): Promise<ProviderHealth[]> {
  const db = createDb(env.DB);
  const providers = await db.query.llmProviders.findMany({
    where: eq(llmProviders.enabled, true),
    orderBy: [llmProviders.priority],
  });

  const results: ProviderHealth[] = [];

  for (const providerConfig of providers) {
    const provider = PROVIDER_MAP[providerConfig.name];
    if (!provider) continue;

    const apiKeyKey = API_KEY_MAP[providerConfig.name];
    const apiKey = env[apiKeyKey] as string;
    if (!apiKey) continue;

    let healthy = false;
    let rateLimitRemaining: number | undefined;

    try {
      if (providerConfig.name === "openrouter") {
        const orProvider = provider as OpenRouterProvider;
        healthy = await orProvider.healthCheck(apiKey);
      } else {
        const model = getDefaultModel(providerConfig.name);
        healthy = await provider.healthCheck(apiKey, model);
      }

      if (healthy) {
        const testResponse = await fetch(
          `${provider.baseUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...provider.getHeaders(apiKey),
            },
            body: JSON.stringify({
              model: getDefaultModel(providerConfig.name),
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
            }),
          },
        );
        const remaining = testResponse.headers.get(
          "x-ratelimit-remaining-requests",
        );
        rateLimitRemaining = remaining ? parseInt(remaining) : undefined;
      }
    } catch {
      healthy = false;
    }

    const healthEntry: ProviderHealth = {
      name: providerConfig.name,
      healthy,
      lastChecked: Date.now(),
      cooldownUntil: 0,
      rateLimitRemaining,
    };
    healthCache.set(providerConfig.name, healthEntry);
    results.push(healthEntry);

    await db
      .update(llmProviders)
      .set({
        isHealthy: healthy,
        lastHealthCheck: new Date(),
        rateLimitRemaining,
      })
      .where(eq(llmProviders.id, providerConfig.id));
  }

  return results;
}

export function getProvidersStatus(): ProviderHealth[] {
  return Array.from(healthCache.values());
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    groq: "openai/gpt-oss-120b",
    cerebras: "gpt-oss-120b",
    openrouter: "google/gemma-4-31b-it:free",
  };
  return defaults[provider] ?? "gpt-oss-120b";
}
