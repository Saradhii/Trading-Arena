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


}
