import type { LLMToolDef } from "./types";

export const tradingTools: LLMToolDef[] = [
  {
    type: "function",
    function: {
      name: "market_buy",
      description:
        "Buy an asset at the current market price. Use this when you want to open or increase a position.",
      parameters: {
        type: "object",
        properties: {
          assetSymbol: {
            type: "string",
            description: "The symbol of the asset to buy (e.g. BTC, ETH, AAPL)",
          },
          quantity: {
            type: "number",
            description: "Number of units to buy",
          },
          reasoning: {
            type: "string",
            description:
              "Your reasoning for this buy decision based on market analysis",
          },
        },
        required: ["assetSymbol", "quantity", "reasoning"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "market_sell",
      description:
        "Sell an asset at the current market price. Use this when you want to close or reduce a position.",
      parameters: {
        type: "object",
        properties: {
          assetSymbol: {
            type: "string",
            description: "The symbol of the asset to sell (e.g. BTC, ETH, AAPL)",
          },
          quantity: {
            type: "number",
            description: "Number of units to sell",
          },
          reasoning: {
            type: "string",
            description:
              "Your reasoning for this sell decision based on market analysis",
          },
        },
        required: ["assetSymbol", "quantity", "reasoning"],
      },
    },
  },
];
