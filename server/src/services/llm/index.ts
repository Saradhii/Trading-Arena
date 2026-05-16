import pRetry from "p-retry";
import type { LLMMessage, LLMResponse, LLMToolDef, Env } from "./types";
import { RateLimitError, ProviderError } from "./types";
import { BaseLLMProvider } from "./providers/base";
import { GroqProvider } from "./providers/groq";
import { CerebrasProvider } from "./providers/cerebras";
import { SambaNovaProvider } from "./providers/sambanova";
import { FireworksProvider } from "./providers/fireworks";
import { OpenRouterProvider } from "./providers/openrouter";
import { ZaiProvider } from "./providers/zai";
import { GoogleProvider } from "./providers/google";
import { getAgentByIdOrThrow } from "../../helpers";
import { createDb } from "../../db";

const PROVIDER_MAP: Record<string, BaseLLMProvider> = {
  groq: new GroqProvider(),
  cerebras: new CerebrasProvider(),
  sambanova: new SambaNovaProvider(),
  fireworks: new FireworksProvider(),
  openrouter: new OpenRouterProvider(),
  zai: new ZaiProvider(),
  google: new GoogleProvider(),
};

const API_KEY_MAP: Record<string, keyof Env> = {
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  sambanova: "SAMBANOVA_API_KEY",
  fireworks: "FIREWORKS_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  zai: "ZAI_API_KEY",
  google: "GOOGLE_API_KEY",
};

export async function chatWithTools(
  env: Env,
  agentId: string,
  messages: LLMMessage[],
  tools: LLMToolDef[],
): Promise<LLMResponse> {
  const db = createDb(env.DB);

  const agent = await getAgentByIdOrThrow(db, agentId);

  const providerName = agent.provider;
  const model = agent.model;

  const provider = PROVIDER_MAP[providerName];
  if (!provider) throw new Error(`Unknown provider: ${providerName}`);

  const apiKeyKey = API_KEY_MAP[providerName];
  const apiKey = env[apiKeyKey] as string;
  if (!apiKey) throw new Error(`Missing API key for ${providerName}`);

  return await pRetry(
    () => provider.chatWithTools(apiKey, model, messages, tools),
    {
      retries: 3,
      minTimeout: 5000,
      maxTimeout: 30000,
      factor: 2,
      shouldRetry: ({ error }) =>
        error instanceof RateLimitError ||
        (error instanceof ProviderError && error.statusCode >= 500),
      onFailedAttempt: ({ error, attemptNumber, retriesLeft, retryDelay }) => {
        console.warn(
          `[llm] retry attempt=${attemptNumber} remaining=${retriesLeft} delay=${retryDelay}ms agent=${agentId} provider=${providerName} reason=${error.message}`,
        );
      },
    },
  );
}
