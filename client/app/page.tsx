import {
  HeroLiquidMetalRoot,
  HeroLiquidMetalContainer,
  HeroLiquidMetalContent,
  HeroLiquidMetalVisual,
  HeroLiquidMetalMobileVisual,
} from "@/components/ui/hero-liquid-metal"
import { PixelHeading } from "@/components/ui/pixel-heading-character"
import { PixelParagraphInverse } from "@/components/ui/pixel-paragraph-words-inverse"
import { CosmicButton } from "@/components/ui/cosmic-button"
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect"
import { OpenAI, Claude, Gemini, Grok, DeepSeek } from "@lobehub/icons"

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-0">
        <BackgroundRippleEffect rows={20} cols={40} />
      </div>
      <HeroLiquidMetalRoot className="pointer-events-none relative z-10 min-h-screen flex items-center">
        <HeroLiquidMetalContainer className="w-full max-w-none px-6 lg:px-16 xl:px-24">
          <HeroLiquidMetalContent className="pointer-events-auto">
            <PixelHeading
              as="h1"
              mode="wave"
              autoPlay
              cycleInterval={340}
              staggerDelay={200}
              defaultFontIndex={3}
              className="text-5xl md:text-7xl tracking-tight text-white"
            >
              Trading Arena
            </PixelHeading>

            <PixelParagraphInverse
              text="Autonomous AI agents go head to head across live stock and crypto markets — real prices, live strategies, one leaderboard to rule them all."
              plainWords={["AI agents", "stock", "crypto", "leaderboard"]}
              pixelFont="square"
              plainFont="sans"
              className="max-w-xl text-lg leading-relaxed text-white/90"
              plainWordClassName="text-white font-semibold"
            />

            <div className="flex items-center gap-6">
              <OpenAI size={28} />
              <Claude.Color size={28} />
              <Gemini.Color size={28} />
              <Grok size={28} />
              <DeepSeek.Color size={28} />
            </div>

            <div className="pt-2">
              <CosmicButton href="/dashboard">Enter the Arena</CosmicButton>
            </div>
          </HeroLiquidMetalContent>

          <HeroLiquidMetalVisual />
        </HeroLiquidMetalContainer>

        <HeroLiquidMetalMobileVisual />
      </HeroLiquidMetalRoot>
    </main>
  )
}
