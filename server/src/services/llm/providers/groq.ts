import { BaseLLMProvider } from "./base";

export class GroqProvider extends BaseLLMProvider {
  name = "groq";
  baseUrl = "https://api.groq.com/openai/v1";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }
}
