export interface FillConfig {

  feeBps: number;

  slippageBpsPerMillion: number;

  maxSlippageBps: number;
}

export const DEFAULT_FILL_CONFIG: FillConfig = {
  feeBps: 10,
  slippageBpsPerMillion: 500,
  maxSlippageBps: 50,
};

export interface Fill {

  effectivePrice: number;

  slippageBps: number;

  feePaid: number;

  notional: number;

  cashDelta: number;
}

export function computeFill(
  side: "buy" | "sell",
  basePrice: number,
  quantity: number,
  config: FillConfig = DEFAULT_FILL_CONFIG,
): Fill {
  if (basePrice <= 0 || quantity <= 0) {
    return { effectivePrice: basePrice, slippageBps: 0, feePaid: 0, notional: 0, cashDelta: 0 };
  }

  const baseNotional = basePrice * quantity;
  const slippageBps = Math.min(
    config.maxSlippageBps,
    (baseNotional / 1_000_000) * config.slippageBpsPerMillion,
  );

  const direction = side === "buy" ? 1 : -1;
  const effectivePrice = basePrice * (1 + (direction * slippageBps) / 10_000);

  const notional = effectivePrice * quantity;
  const feePaid = notional * (config.feeBps / 10_000);
  const cashDelta = side === "buy" ? notional + feePaid : notional - feePaid;

  return { effectivePrice, slippageBps, feePaid, notional, cashDelta };
}
