"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

interface Asset {
  id: string
  symbol: string
  name: string
  assetType: "crypto" | "stock"
  currentPrice: number
  logoUrl: string | null
}

const fmtPrice = (n: number) => {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 6 })}`
}

export function AssetTicker({ className }: { className?: string }) {
  const [assets, setAssets] = useState<Asset[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch("/api/assets")
        .then((r) => r.json() as Promise<Asset[]>)
        .then((data) => {
          if (!cancelled) setAssets(data)
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (!assets || assets.length === 0) return null

  const items = [...assets, ...assets]
  const duration = `${Math.max(40, assets.length * 4)}s`

  return (
    <div
      className={cn(
        "group relative h-full w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]",
        className,
      )}
      aria-label="Live asset prices"
    >
      <div
        className="animate-ticker flex h-full w-max items-center gap-8 group-hover:[animation-play-state:paused]"
        style={{ "--duration": duration } as React.CSSProperties}
      >
        {items.map((a, i) => (
          <div
            key={`${a.id}-${i}`}
            className="flex items-center gap-2 font-pixel-square text-xs tracking-wide"
          >
            {a.logoUrl ? (
              <img
                src={a.logoUrl}
                alt=""
                width={16}
                height={16}
                loading="lazy"
                decoding="async"
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full object-contain",
                  a.assetType === "stock" && "bg-white p-[1px]",
                )}
              />
            ) : (
              <span
                aria-hidden
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-foreground/10 text-[7px] text-foreground/60"
              >
                {a.symbol.slice(0, 2)}
              </span>
            )}
            <span className="text-foreground/90">{a.symbol}</span>
            <span className="text-foreground/50">{fmtPrice(a.currentPrice)}</span>
            <span
              className={cn(
                "text-[9px] uppercase tracking-wider",
                a.assetType === "crypto"
                  ? "text-amber-500/70"
                  : "text-sky-500/70",
              )}
            >
              {a.assetType === "crypto" ? "CRY" : "STK"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
