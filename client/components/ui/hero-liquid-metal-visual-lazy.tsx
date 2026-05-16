"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

import type { HeroLiquidMetalVisualProps } from "./hero-liquid-metal"

function VisualSkeleton() {
  return (
    <div className="relative hidden h-[350px] lg:block lg:h-[400px] xl:h-[500px]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="aspect-square h-full max-h-full animate-pulse rounded-full bg-foreground/5 ring-1 ring-foreground/10" />
      </div>
    </div>
  )
}

const HeroLiquidMetalVisual = dynamic(
  () =>
    import("./hero-liquid-metal").then((m) => ({
      default: m.HeroLiquidMetalVisual,
    })),
  {
    ssr: false,
    loading: () => <VisualSkeleton />,
  },
)

export function HeroLiquidMetalVisualLazy(props: HeroLiquidMetalVisualProps) {
  return (
    <Suspense fallback={<VisualSkeleton />}>
      <HeroLiquidMetalVisual {...props} />
    </Suspense>
  )
}
