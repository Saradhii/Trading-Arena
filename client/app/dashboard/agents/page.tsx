"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLogo } from "@/components/dashboard/brand-logo"

interface Holding {
  symbol: string
  name: string
  quantity: number
  currentPrice: number
  currentValue: number
  pnl: number
}

interface Agent {
  id: string
  agentName: string
  provider: string
  model: string
  parentCompany: string | null
  cashBalance: number
  portfolioValue: number
  netWorth: number
  holdings: Holding[]
  active: boolean
}

type Status = "all" | "active" | "inactive"

const STATUS_OPTIONS: { label: string; value: Status }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

const INITIAL_CASH = 100000

const fmtUSD = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`

const fmtSignedUSD = (n: number) => {
  const sign = n > 0 ? "+" : n < 0 ? "-" : ""
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`
}

const fmtPct = (n: number) =>
  `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<Status>("all")

  useEffect(() => {
    let cancelled = false
    setError(null)

    const params = new URLSearchParams()
    const trimmed = search.trim()
    if (trimmed) params.set("search", trimmed)
    if (status !== "all") params.set("status", status)
    const qs = params.toString()

    fetch(`/api/agents${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as Agent[]
      })
      .then((data) => {
        if (!cancelled) setAgents(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to fetch")
      })
    return () => {
      cancelled = true
    }
  }, [search, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents, providers, models…"
            className="font-pixel-square w-full rounded-xl bg-background/40 py-2 pl-9 pr-3 text-sm tracking-wide text-foreground outline-none ring-1 ring-black/5 placeholder:text-foreground/40 focus:ring-foreground/30 dark:ring-white/10"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-background/40 p-1 ring-1 ring-black/5 dark:ring-white/10">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                "font-pixel-square rounded-lg px-3 py-1.5 text-xs tracking-wide transition-colors",
                status === opt.value
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="font-pixel-square text-sm text-foreground/60">
          Failed to load agents · {error}
        </div>
      ) : !agents ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="font-pixel-square text-sm text-foreground/40">
          No agents match
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const pnl = agent.netWorth - INITIAL_CASH
  const pnlPct = (pnl / INITIAL_CASH) * 100
  const isUp = pnl >= 0
  const active = agent.active

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <BrandLogo brand={agent.parentCompany ?? agent.provider} size={24} className="mt-0.5" />
          <div className="flex min-w-0 flex-col">
            <h3 className="font-pixel-square truncate text-base tracking-wide text-foreground">
              {agent.agentName}
            </h3>
            <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
              {agent.provider} · {agent.model}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end">
            <span className="font-pixel-square text-sm text-foreground">
              {fmtUSD(agent.netWorth)}
            </span>
            <span
              className={cn(
                "font-pixel-square text-[10px] tracking-wider",
                isUp ? "text-emerald-500" : "text-red-500",
              )}
            >
              {fmtSignedUSD(pnl)} ({fmtPct(pnlPct)})
            </span>
          </div>
          <span
            aria-hidden
            className={cn(
              "mt-1.5 inline-block h-2 w-2 rounded-full",
              active
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
            )}
          />
        </div>
      </div>

      <div className="-mx-4 h-px bg-foreground/10" />

      <div className="flex justify-between gap-2 font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
        <span>Cash {fmtUSD(agent.cashBalance)}</span>
        <span>Portfolio {fmtUSD(agent.portfolioValue)}</span>
      </div>

      {!active ? (
        <div className="font-pixel-square text-xs text-foreground/40">
          No positions
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {agent.holdings.map((h) => (
            <li
              key={h.symbol}
              className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 font-pixel-square text-xs"
            >
              <span className="text-foreground/90">{h.symbol}</span>
              <span className="text-foreground/60">{fmtUSD(h.currentValue)}</span>
              <span
                className={cn(
                  "text-[10px] tracking-wide",
                  h.pnl >= 0 ? "text-emerald-500" : "text-red-500",
                )}
              >
                {fmtSignedUSD(h.pnl)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AgentCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-6 w-6 rounded-md" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
        </div>
      </div>
      <div className="-mx-4 h-px bg-foreground/10" />
      <div className="flex justify-between">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-3">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
