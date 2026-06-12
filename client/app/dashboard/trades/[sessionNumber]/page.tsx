"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { isBaselineAgent } from "@/lib/agents"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLogo } from "@/components/dashboard/brand-logo"
import { AssetLogo } from "@/components/dashboard/asset-logo"
import {
  DecisionDetailSheet,
  OrderDetailSheet,
} from "@/components/dashboard/order-detail-sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Session {
  id: string
  sessionNumber: number
  status: "running" | "completed"
  startedAt: string
  completedAt: string | null
}

interface OrderAgent {
  id: string
  agentName: string
  provider: string
  model: string
  parentCompany: string | null
}

interface OrderAsset {
  id: string
  symbol: string
  name: string
  assetType: "crypto" | "stock"
  logoUrl: string | null
}

interface SessionOrder {
  id: string
  orderType: "market_buy" | "market_sell"
  quantity: number
  priceAtOrder: number
  reasoning: string | null
  executedAt: string
  agent: OrderAgent
  asset: OrderAsset
}

interface AgentDecision {
  id: string
  decisionType: "trade" | "hold" | "error"
  reasoning: string | null
  agent: OrderAgent
}

interface SessionLog {
  id: string
  providerUsed: string
  modelUsed: string
  status: "success" | "skipped" | "failed"
  failureReason: string | null
  toolCallsMade: number | null
  tokensUsed: number | null
  latencyMs: number | null
  agent: OrderAgent
}

const fmtUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtQty = (n: number) =>
  n >= 1
    ? n.toLocaleString("en-US", { maximumFractionDigits: 4 })
    : n.toLocaleString("en-US", { maximumFractionDigits: 8 })

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const fmtDuration = (started: string, completed: string | null) => {
  if (!completed) return "—"
  const ms = new Date(completed).getTime() - new Date(started).getTime()
  if (ms < 0) return "—"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionNumber: string }>
}) {
  const { sessionNumber } = use(params)
  const [session, setSession] = useState<Session | null>(null)
  const [orders, setOrders] = useState<SessionOrder[] | null>(null)
  const [decisions, setDecisions] = useState<AgentDecision[] | null>(null)
  const [logs, setLogs] = useState<SessionLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SessionOrder | null>(null)
  const [selectedDecision, setSelectedDecision] = useState<{
    decision: AgentDecision
    log: SessionLog | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)

    Promise.all([
      fetch(`/api/sessions/${sessionNumber}`).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as Session
      }),
      fetch(`/api/sessions/${sessionNumber}/orders`).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as SessionOrder[]
      }),
      fetch(`/api/sessions/${sessionNumber}/decisions`).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as { decisions: AgentDecision[]; logs: SessionLog[] }
      }),
    ])
      .then(([s, o, d]) => {
        if (cancelled) return
        setSession(s)
        setOrders(
          o
            .filter((x) => !isBaselineAgent(x.agent))
            .sort(
              (a, b) =>
                new Date(b.executedAt).getTime() -
                new Date(a.executedAt).getTime(),
            ),
        )
        setDecisions(d.decisions.filter((x) => !isBaselineAgent(x.agent)))
        setLogs(d.logs.filter((x) => !isBaselineAgent(x.agent)))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to fetch")
      })

    return () => {
      cancelled = true
    }
  }, [sessionNumber])

  const isRunning = session?.status === "running"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/trades"
            className="font-pixel-square inline-flex w-fit items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3 w-3" />
            All sessions
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-pixel-square text-lg tracking-wide text-foreground">
              Session #{sessionNumber}
            </h1>
            {session ? (
              <span
                className={cn(
                  "font-pixel-square inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider",
                  isRunning
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-foreground/5 text-foreground/60",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isRunning
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                      : "bg-foreground/30",
                  )}
                />
                {session.status}
              </span>
            ) : null}
          </div>
        </div>

        {session ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl bg-background/40 px-4 py-2 ring-1 ring-black/5 dark:ring-white/10">
            <Stat label="Started" value={fmtTime(session.startedAt)} />
            <Stat
              label="Completed"
              value={session.completedAt ? fmtTime(session.completedAt) : "—"}
            />
            <Stat
              label="Duration"
              value={fmtDuration(session.startedAt, session.completedAt)}
            />
            <Stat label="Trades" value={orders ? String(orders.length) : "…"} />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl bg-background/40 ring-1 ring-black/5 dark:ring-white/10">
        {error ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/60">
            Failed to load · {error}
          </div>
        ) : !orders ? (
          <TradesTableSkeleton />
        ) : orders.length === 0 ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/40">
            No trades executed this session — see agent activity below.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/10 hover:bg-transparent">
                <TableHead className="font-pixel-square hidden text-[10px] uppercase tracking-wider md:table-cell">
                  Time
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Agent
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Side
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Asset
                </TableHead>
                <TableHead className="font-pixel-square hidden text-right text-[10px] uppercase tracking-wider sm:table-cell">
                  Qty
                </TableHead>
                <TableHead className="font-pixel-square hidden text-right text-[10px] uppercase tracking-wider lg:table-cell">
                  Price
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Notional
                </TableHead>
                <TableHead className="font-pixel-square hidden text-[10px] uppercase tracking-wider md:table-cell">
                  Reasoning
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const isBuy = o.orderType === "market_buy"
                const notional = o.quantity * o.priceAtOrder
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer border-foreground/5"
                    onClick={() => setSelected(o)}
                  >
                    <TableCell className="font-pixel-square hidden text-xs text-foreground/60 md:table-cell">
                      {fmtTime(o.executedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <BrandLogo
                          brand={o.agent.parentCompany ?? o.agent.provider}
                          size={16}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-pixel-square truncate text-xs text-foreground">
                            {o.agent.agentName}
                          </span>
                          <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                            {o.agent.provider}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-pixel-square inline-flex items-center rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider",
                          isBuy
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-red-500/10 text-red-500",
                        )}
                      >
                        {isBuy ? "Buy" : "Sell"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <AssetLogo asset={o.asset} />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-pixel-square text-xs text-foreground">
                            {o.asset.symbol}
                          </span>
                          <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                            {o.asset.assetType}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-pixel-square hidden text-right text-xs text-foreground sm:table-cell">
                      {fmtQty(o.quantity)}
                    </TableCell>
                    <TableCell className="font-pixel-square hidden text-right text-xs text-foreground/80 lg:table-cell">
                      {fmtUSD(o.priceAtOrder)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground">
                      {fmtUSD(notional)}
                    </TableCell>
                    <TableCell className="hidden max-w-[360px] md:table-cell">
                      <span
                        title={o.reasoning ?? ""}
                        className="font-pixel-square line-clamp-1 text-xs text-foreground/60"
                      >
                        {o.reasoning ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {decisions && logs && (
        <div className="flex flex-col gap-2">
          <h2 className="font-pixel-square text-sm uppercase tracking-wider text-foreground/60">
            Agent Activity
          </h2>
          <div className="overflow-hidden rounded-xl bg-background/40 ring-1 ring-black/5 dark:ring-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-foreground/10 hover:bg-transparent">
                  <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                    Agent
                  </TableHead>
                  <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                    Decision
                  </TableHead>
                  <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-pixel-square hidden text-right text-[10px] uppercase tracking-wider sm:table-cell">
                    Latency
                  </TableHead>
                  <TableHead className="font-pixel-square hidden text-right text-[10px] uppercase tracking-wider md:table-cell">
                    Tokens
                  </TableHead>
                  <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                    Reasoning
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((d) => {
                  const log = logs.find((l) => l.agent.id === d.agent.id)
                  return (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer border-foreground/5"
                      onClick={() =>
                        setSelectedDecision({ decision: d, log: log ?? null })
                      }
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <BrandLogo
                            brand={d.agent.parentCompany ?? d.agent.provider}
                            size={16}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="font-pixel-square truncate text-xs text-foreground">
                              {d.agent.agentName}
                            </span>
                            <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                              {log?.providerUsed ?? d.agent.provider}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-pixel-square inline-flex items-center rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            d.decisionType === "trade"
                              ? "bg-blue-500/10 text-blue-500"
                              : d.decisionType === "hold"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-red-500/10 text-red-500",
                          )}
                        >
                          {d.decisionType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-pixel-square inline-flex items-center rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider",
                            log?.status === "success"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500",
                          )}
                        >
                          {log?.status ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="font-pixel-square hidden text-right text-xs text-foreground/60 sm:table-cell">
                        {log?.latencyMs != null ? `${(log.latencyMs / 1000).toFixed(1)}s` : "—"}
                      </TableCell>
                      <TableCell className="font-pixel-square hidden text-right text-xs text-foreground/60 md:table-cell">
                        {log?.tokensUsed != null ? log.tokensUsed.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] sm:max-w-[280px] lg:max-w-[400px]">
                        <span
                          title={d.reasoning ?? ""}
                          className="font-pixel-square line-clamp-2 text-xs text-foreground/60"
                        >
                          {d.reasoning ?? "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {selected ? (
        <OrderDetailSheet
          order={selected}
          sessionNumber={Number(sessionNumber)}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {selectedDecision ? (
        <DecisionDetailSheet
          decision={selectedDecision.decision}
          log={selectedDecision.log}
          onClose={() => setSelectedDecision(null)}
        />
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-pixel-square text-[9px] uppercase tracking-wider text-foreground/40">
        {label}
      </span>
      <span className="font-pixel-square text-xs text-foreground">{value}</span>
    </div>
  )
}

function TradesTableSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-3 border-b border-foreground/10 px-3 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-foreground/5 px-3 py-3 last:border-0"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-12 rounded-md" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}
