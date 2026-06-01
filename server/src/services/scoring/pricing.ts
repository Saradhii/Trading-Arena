export const PROVIDER_PRICE_PER_MTOK: Record<string, number> = {
  groq: 0.6,
  cerebras: 0.8,
  sambanova: 0.9,
  fireworks: 0.9,
  openrouter: 1.5,
  zai: 0.6,
  google: 0.5,
  algorithmic: 0,
  external: 0,
  http: 0,
};

const DEFAULT_PRICE_PER_MTOK = 1.0;

export function estimateCostUsd(provider: string, tokens: number): number {
  const price = PROVIDER_PRICE_PER_MTOK[provider] ?? DEFAULT_PRICE_PER_MTOK;
  return (tokens / 1_000_000) * price;
}
