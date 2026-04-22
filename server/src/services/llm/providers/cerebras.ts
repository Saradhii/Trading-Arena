import { BaseLLMProvider } from "./base";

export class CerebrasProvider extends BaseLLMProvider {
  name = "cerebras";
  baseUrl = "https://api.cerebras.ai/v1";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }
}
