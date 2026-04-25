import type { LLMMessage, LLMResponse, LLMToolCall, LLMToolDef } from "../types";
import { BaseLLMProvider } from "./base";
import { RateLimitError, ProviderError } from "../types";

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
    id?: string;
  };
}

interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: { totalTokenCount?: number };
  modelVersion?: string;
}

export class GoogleProvider extends BaseLLMProvider {
  name = "google";
  baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  getHeaders(apiKey: string): Record<string, string> {
    return {
      "X-goog-api-key": apiKey,
    };
  }

  async chatWithTools(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    tools: LLMToolDef[],
  ): Promise<LLMResponse> {
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversation = messages.filter((m) => m.role !== "system");

    const contents: GeminiContent[] = conversation.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content ?? "" }],
    }));

    const body: Record<string, unknown> = {
      contents,
      tools: [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ],
    };

    const systemText = systemMessages
      .map((m) => m.content ?? "")
      .filter((s) => s.length > 0)
      .join("\n\n");
    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }

    const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(url, {
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

    const data = (await response.json()) as GeminiResponse;
    const cand = data.candidates?.[0];
    if (!cand) {
      throw new ProviderError(this.name, 502);
    }

    let textContent = "";
    const toolCalls: LLMToolCall[] = [];
    let toolCallIdx = 0;

    for (const part of cand.content?.parts ?? []) {
      if (typeof part.text === "string") {
        textContent += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: part.functionCall.id ?? `gem_${Date.now()}_${toolCallIdx++}`,
          type: "function",
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args ?? {}),
          },
        });
      }
    }

    return {
      content: textContent || null,
      toolCalls,
      providerUsed: this.name,
      modelUsed: data.modelVersion ?? model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }

  async healthCheck(apiKey: string, model: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getHeaders(apiKey),
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
