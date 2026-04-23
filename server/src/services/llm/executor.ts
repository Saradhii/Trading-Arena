import type { Database } from "../../db";
import type { LLMToolCall } from "./types";
import { marketBuy, marketSell } from "../../tools/trading";

interface ToolResult {
  success: boolean;
  toolCallId: string;
  functionName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export async function executeToolCalls(
  db: Database,
  toolCalls: LLMToolCall[],
  agentId: string,
  sessionId: string,
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    const fnName = call.function.name;
    let args: Record<string, unknown>;

    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      results.push({
        success: false,
        toolCallId: call.id,
        functionName: fnName,
        error: "Failed to parse arguments",
      });
      continue;
    }

    try {
      let result: unknown;

      switch (fnName) {
        case "market_buy":
          result = await marketBuy(
            db,
            agentId,
            args.assetSymbol as string,
            args.quantity as number,
            args.reasoning as string,
            sessionId,
          );
          break;

        case "market_sell":
          result = await marketSell(
            db,
            agentId,
            args.assetSymbol as string,
            args.quantity as number,
            args.reasoning as string,
            sessionId,
          );
          break;

        default:
          results.push({
            success: false,
            toolCallId: call.id,
            functionName: fnName,
            error: `Unknown function: ${fnName}`,
          });
          continue;
      }

      results.push({
        success: true,
        toolCallId: call.id,
        functionName: fnName,
        args,
        result,
      });
    } catch (err) {
      results.push({
        success: false,
        toolCallId: call.id,
        functionName: fnName,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}
