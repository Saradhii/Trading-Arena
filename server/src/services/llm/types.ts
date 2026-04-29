export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: LLMToolCall[];
  tool_call_id?: string;
}

export interface LLMToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string | null;
  toolCalls: LLMToolCall[];
  providerUsed: string;
  modelUsed: string;
  tokensUsed?: number;
}

export class RateLimitError extends Error {
  provider: string;
  retryAfter?: number;

  constructor(provider: string, retryAfter?: number) {
    super(`Rate limited on ${provider}`);
    this.name = "RateLimitError";
    this.provider = provider;
    this.retryAfter = retryAfter;
  }
}

export class ProviderError extends Error {
  provider: string;
  statusCode: number;

  constructor(provider: string, statusCode: number) {
    super(`Provider ${provider} returned ${statusCode}`);
    this.name = "ProviderError";
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export interface Env {
  DB: D1Database;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
  OPENROUTER_API_KEY: string;
  FINNHUB_API_KEY: string;
  ZAI_API_KEY: string;
  GOOGLE_API_KEY: string;
  COINGECKO_API_KEY: string;
}
