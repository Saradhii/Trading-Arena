import { BaseLLMProvider } from "./base";

export class OpenRouterProvider extends BaseLLMProvider {
  name = "openrouter";
  baseUrl = "https://openrouter.ai/api/v1";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://trading-arena.app",
      "X-Title": "Trading Arena",
    };
  }

  async healthCheck(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/key", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as {
        data?: { is_free_tier?: boolean };
      };
      return data.data?.is_free_tier !== undefined;
    } catch {
      return false;
    }
  }
}
