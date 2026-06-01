export function meanOf(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = meanOf(xs);
  const variance = xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

export function returnsFromEquity(equity: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1] > 0) out.push((equity[i] - equity[i - 1]) / equity[i - 1]);
  }
  return out;
}

export function sharpe(returns: number[], riskFree = 0): number {
  if (returns.length < 2) return 0;
  const excess = returns.map((r) => r - riskFree);
  const sd = stdDev(excess);
  if (sd === 0) return 0;
  return meanOf(excess) / sd;
}

export function sortino(returns: number[], riskFree = 0): number {
  if (returns.length < 2) return 0;
  const excess = returns.map((r) => r - riskFree);
  const downside = excess.filter((r) => r < 0);
  if (downside.length === 0) return meanOf(excess) > 0 ? Infinity : 0;
  const downsideDev = Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / excess.length);
  if (downsideDev === 0) return 0;
  return meanOf(excess) / downsideDev;
}

export function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

export function totalReturn(equity: number[]): number {
  if (equity.length < 2 || equity[0] === 0) return 0;
  return (equity[equity.length - 1] - equity[0]) / equity[0];
}

export function brierScore(predictions: Array<{ confidence: number; correct: boolean }>): number | null {
  if (predictions.length === 0) return null;
  const sum = predictions.reduce(
    (s, p) => s + (p.confidence - (p.correct ? 1 : 0)) ** 2,
    0,
  );
  return sum / predictions.length;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export interface EloEntry {
  id: string;
  rating: number;

  rank: number;
}

export function updateEloRatings(entries: EloEntry[], k = 32): Record<string, number> {
  const result: Record<string, number> = {};
  const n = entries.length;
  if (n < 2) {
    for (const e of entries) result[e.id] = e.rating;
    return result;
  }
  const perMatchK = k / (n - 1);

  for (const a of entries) {
    let delta = 0;
    for (const b of entries) {
      if (a.id === b.id) continue;
      const actual = a.rank < b.rank ? 1 : a.rank > b.rank ? 0 : 0.5;
      delta += perMatchK * (actual - expectedScore(a.rating, b.rating));
    }
    result[a.id] = a.rating + delta;
  }
  return result;
}
