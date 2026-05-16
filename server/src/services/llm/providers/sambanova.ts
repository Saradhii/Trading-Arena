import { BaseLLMProvider } from "./base";

export class SambaNovaProvider extends BaseLLMProvider {
  name = "sambanova";
  baseUrl = "https://api.sambanova.ai/v1";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }
}
