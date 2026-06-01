export function simpleMovingAverage(prices: number[], period: number): number | null {
  if (period <= 0 || prices.length < period) return null;
  const slice = prices.slice(prices.length - period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function exponentialMovingAverage(prices: number[], period: number): number | null {
  if (period <= 0 || prices.length < period) return null;
  const k = 2 / (period + 1);

  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function relativeStrengthIndex(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function toReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return out;
}

export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const x = a.slice(a.length - n);
  const y = b.slice(b.length - n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = x[i] - mx;
    const ey = y[i] - my;
    num += ex * ey;
    dx += ex * ex;
    dy += ey * ey;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export type IndicatorName = "RSI" | "SMA" | "EMA";

export function computeIndicator(
  indicator: IndicatorName,
  prices: number[],
  period?: number,
): number | null {
  switch (indicator) {
    case "RSI":
      return relativeStrengthIndex(prices, period ?? 14);
    case "SMA":
      return simpleMovingAverage(prices, period ?? 10);
    case "EMA":
      return exponentialMovingAverage(prices, period ?? 10);
    default:
      return null;
  }
}
