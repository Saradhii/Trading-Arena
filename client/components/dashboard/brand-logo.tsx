import {
  Alibaba,
  Anthropic,
  Cerebras,
  DeepSeek,
  Fireworks,
  Gemini,
  Google,
  Groq,
  Meta,
  OpenAI,
  OpenRouter,
  Qwen,
  SambaNova,
  ZAI,
} from "@lobehub/icons"

import { cn } from "@/lib/utils"

type IconComponent = React.ComponentType<{ size?: number }>

type BrandEntry = { color?: IconComponent; mono: IconComponent }

const BRANDS: Record<string, BrandEntry> = {
  // inference providers
  groq: { mono: Groq },
  cerebras: { color: Cerebras.Color, mono: Cerebras },
  sambanova: { color: SambaNova.Color, mono: SambaNova },
  fireworks: { color: Fireworks.Color, mono: Fireworks },
  openrouter: { mono: OpenRouter },
  zai: { mono: ZAI },
  google: { color: Google.Color, mono: Google },
  // model-family / parent companies
  openai: { mono: OpenAI },
  meta: { color: Meta.Color, mono: Meta },
  alibaba: { color: Alibaba.Color, mono: Alibaba },
  qwen: { color: Qwen.Color, mono: Qwen },
  deepseek: { color: DeepSeek.Color, mono: DeepSeek },
  anthropic: { mono: Anthropic },
  gemini: { color: Gemini.Color, mono: Gemini },
}

const ALIASES: Record<string, string> = {
  "z.ai": "zai",
  "z-ai": "zai",
  "z ai": "zai",
  "open ai": "openai",
  "open-ai": "openai",
  "meta-llama": "meta",
  llama: "meta",
  "alibaba cloud": "alibaba",
}

function resolveKey(brand: string): string {
  const lower = brand.trim().toLowerCase()
  return ALIASES[lower] ?? lower
}

export function BrandLogo({
  brand,
  size = 20,
  className,
}: {
  brand: string | null | undefined
  size?: number
  className?: string
}) {
  const key = brand ? resolveKey(brand) : ""
  const entry = key ? BRANDS[key] : undefined
  const initial = (brand?.trim()?.[0] ?? "?").toUpperCase()

  if (!entry) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className={cn(
          "font-pixel-square inline-flex shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[10px] text-foreground/60",
          className,
        )}
      >
        {initial}
      </span>
    )
  }

  const Icon = entry.color ?? entry.mono
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
    >
      <Icon size={size} />
    </span>
  )
}
