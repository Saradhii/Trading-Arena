import { BaseLLMProvider } from "./base";

export class FireworksProvider extends BaseLLMProvider {
  name = "fireworks";
  baseUrl = "https://api.fireworks.ai/inference/v1";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }
}
