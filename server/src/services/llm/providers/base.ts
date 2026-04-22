import type { LLMMessage, LLMResponse, LLMToolDef } from "../types";
import { RateLimitError, ProviderError } from "../types";

export abstract class BaseLLMProvider {
  abstract name: string;
  abstract baseUrl: string;

  abstract getHeaders(apiKey: string): Record<string, string>;

  async chatWithTools(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    tools: LLMToolDef[],
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model,
      messages,
      tools,
      tool_choice: "auto",
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getHeaders(apiKey),
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new RateLimitError(
        this.name,
        retryAfter ? parseInt(retryAfter) : undefined,
      );
    }

    if (!response.ok) {
      throw new ProviderError(this.name, response.status);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      model: string;
      usage?: { total_tokens: number };
    };

    const choice = data.choices[0];
    const rateLimitRemaining = response.headers.get(
      "x-ratelimit-remaining-requests",
    );

    return {
      content: choice.message.content,
      toolCalls: (choice.message.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      providerUsed: this.name,
      modelUsed: data.model,
      tokensUsed: data.usage?.total_tokens,
      rateLimitRemaining: rateLimitRemaining
        ? parseInt(rateLimitRemaining)
        : undefined,
    };
  }

  async healthCheck(apiKey: string, model: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getHeaders(apiKey),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
