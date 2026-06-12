"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/dashboard/brand-logo"
import { AssetLogo } from "@/components/dashboard/asset-logo"

export interface SheetOrder {
  orderType: "market_buy" | "market_sell"
  quantity: number
  priceAtOrder: number
  reasoning: string | null
  executedAt: string
  agent: {
    agentName: string
    provider: string
    model: string
    parentCompany: string | null
  }
  asset: {
    symbol: string
    name: string
    assetType: "crypto" | "stock"
    logoUrl: string | null
  }
}

const fmtUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtQty = (n: number) =>
  n >= 1
    ? n.toLocaleString("en-US", { maximumFractionDigits: 4 })
    : n.toLocaleString("en-US", { maximumFractionDigits: 8 })

function DetailSheet({
  agent,
  agentSubtitle,
  ariaLabel,
  onClose,
  children,
}: {
  agent: SheetOrder["agent"]
  agentSubtitle?: string
  ariaLabel: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  // Portal to <body>: the dashboard's blurred <main> panel is a backdrop-filter
  // containing block, so position:fixed inside it pins to the panel, not the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ animation: "ods-fade 0.2s ease-out both" }}
      />
      <div
        className="absolute bottom-4 right-4 top-4 flex w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl bg-background/90 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 backdrop-blur-xl dark:ring-white/10"
        style={{ animation: "ods-slide 0.25s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-foreground/10 p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo brand={agent.parentCompany ?? agent.provider} size={22} />
            <div className="flex min-w-0 flex-col">
              <span className="font-pixel-square truncate text-sm text-foreground">
                {agent.agentName}
              </span>
              <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                {agentSubtitle ?? `${agent.provider} · ${agent.model}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
      </div>

      <style>{`
        @keyframes ods-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ods-slide { from { transform: translateX(calc(100% + 1rem)); } to { transform: translateX(0); } }
      `}</style>
    </div>,
    document.body,
  )
}

export function OrderDetailSheet({
  order,
  sessionNumber,
  linkToSession = false,
  onClose,
}: {
  order: SheetOrder
  sessionNumber: number
  linkToSession?: boolean
  onClose: () => void
}) {
  const isBuy = order.orderType === "market_buy"
  const notional = order.quantity * order.priceAtOrder
  const executed = new Date(order.executedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <DetailSheet agent={order.agent} ariaLabel="Trade details" onClose={onClose}>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "font-pixel-square inline-flex items-center rounded-md px-2.5 py-1 text-xs uppercase tracking-wider",
                isBuy
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-500",
              )}
            >
              {isBuy ? "Buy" : "Sell"}
            </span>
            <AssetLogo asset={order.asset} size={22} />
            <span className="font-pixel-square text-base text-foreground">
              {order.asset.symbol}
            </span>
            <span className="font-pixel-square truncate text-xs text-foreground/40">
              {order.asset.name} · {order.asset.assetType}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <SheetStat label="Quantity" value={fmtQty(order.quantity)} />
            <SheetStat label="Price" value={fmtUSD(order.priceAtOrder)} />
            <SheetStat label="Notional" value={fmtUSD(notional)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SheetStat label="Executed" value={executed} />
            {linkToSession ? (
              <Link
                href={`/dashboard/trades/${sessionNumber}`}
                className="flex flex-col gap-0.5 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 ring-1 ring-inset ring-foreground/5 transition-colors hover:bg-foreground/[0.07]"
              >
                <span className="font-pixel-square text-[9px] uppercase tracking-wider text-foreground/40">
                  Session
                </span>
                <span className="font-pixel-square flex items-center gap-1 text-xs tracking-wide text-foreground/90">
                  #{sessionNumber}
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3 text-foreground/40"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </Link>
            ) : (
              <SheetStat label="Session" value={`#${sessionNumber}`} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
              Reasoning
            </span>
            <p className="font-pixel-square whitespace-pre-wrap rounded-lg bg-foreground/[0.03] p-3 text-xs leading-relaxed tracking-wide text-foreground/80 ring-1 ring-inset ring-foreground/5">
              {order.reasoning ?? "No reasoning recorded."}
            </p>
          </div>
    </DetailSheet>
  )
}

export interface SheetDecision {
  decisionType: "trade" | "hold" | "error"
  reasoning: string | null
  agent: SheetOrder["agent"]
}

export interface SheetDecisionLog {
  providerUsed: string
  modelUsed: string
  status: "success" | "skipped" | "failed"
  failureReason: string | null
  toolCallsMade: number | null
  tokensUsed: number | null
  latencyMs: number | null
}

export function DecisionDetailSheet({
  decision,
  log,
  onClose,
}: {
  decision: SheetDecision
  log: SheetDecisionLog | null
  onClose: () => void
}) {
  return (
    <DetailSheet
      agent={decision.agent}
      agentSubtitle={
        log ? `${log.providerUsed} · ${log.modelUsed}` : undefined
      }
      ariaLabel="Decision details"
      onClose={onClose}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "font-pixel-square inline-flex items-center rounded-md px-2.5 py-1 text-xs uppercase tracking-wider",
            decision.decisionType === "trade"
              ? "bg-blue-500/10 text-blue-500"
              : decision.decisionType === "hold"
                ? "bg-amber-500/10 text-amber-500"
                : "bg-red-500/10 text-red-500",
          )}
        >
          {decision.decisionType}
        </span>
        <span
          className={cn(
            "font-pixel-square inline-flex items-center rounded-md px-2.5 py-1 text-xs uppercase tracking-wider",
            log?.status === "success"
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500",
          )}
        >
          {log?.status ?? "unknown"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SheetStat
          label="Latency"
          value={log?.latencyMs != null ? `${(log.latencyMs / 1000).toFixed(1)}s` : "—"}
        />
        <SheetStat
          label="Tokens"
          value={log?.tokensUsed != null ? log.tokensUsed.toLocaleString("en-US") : "—"}
        />
        <SheetStat
          label="Tool calls"
          value={log?.toolCallsMade != null ? String(log.toolCallsMade) : "—"}
        />
      </div>

      {log?.failureReason ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-pixel-square text-[10px] uppercase tracking-wider text-red-500/70">
            Failure reason
          </span>
          <p className="font-pixel-square whitespace-pre-wrap rounded-lg bg-red-500/5 p-3 text-xs leading-relaxed tracking-wide text-red-400 ring-1 ring-inset ring-red-500/15">
            {log.failureReason}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
          Reasoning
        </span>
        <p className="font-pixel-square whitespace-pre-wrap rounded-lg bg-foreground/[0.03] p-3 text-xs leading-relaxed tracking-wide text-foreground/80 ring-1 ring-inset ring-foreground/5">
          {decision.reasoning ?? "No reasoning recorded."}
        </p>
      </div>
    </DetailSheet>
  )
}

function SheetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 ring-1 ring-inset ring-foreground/5">
      <span className="font-pixel-square text-[9px] uppercase tracking-wider text-foreground/40">
        {label}
      </span>
      <span className="font-pixel-square truncate text-xs tracking-wide text-foreground/90">
        {value}
      </span>
    </div>
  )
}
