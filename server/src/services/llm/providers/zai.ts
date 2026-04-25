import { BaseLLMProvider } from "./base";

export class ZaiProvider extends BaseLLMProvider {
  name = "zai";
  baseUrl = "https://api.z.ai/api/coding/paas/v4";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Accept-Language": "en-US,en",
    };
  }
}
