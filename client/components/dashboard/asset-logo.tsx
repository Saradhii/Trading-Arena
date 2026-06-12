import { cn } from "@/lib/utils"

interface AssetLogoProps {
  asset: {
    symbol: string
    assetType: "crypto" | "stock"
    logoUrl: string | null
  }
  size?: number
}

export function AssetLogo({ asset, size = 16 }: AssetLogoProps) {
  if (!asset.logoUrl) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-full bg-foreground/10 text-[7px] text-foreground/60"
      >
        {asset.symbol.slice(0, 2)}
      </span>
    )
  }
  return (
    <img
      src={asset.logoUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={cn(
        "shrink-0 rounded-full object-contain",
        asset.assetType === "stock" && "bg-white p-[1px]",
      )}
    />
  )
}
