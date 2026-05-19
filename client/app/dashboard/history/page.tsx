"use client"

import { useEffect, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLogo } from "@/components/dashboard/brand-logo"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  currentPrice: number
}

interface OrderSession {
  id: string
  sessionNumber: number
}

interface Order {
  id: string
  orderType: "market_buy" | "market_sell"
  quantity: number
  priceAtOrder: number
  reasoning: string | null
  executedAt: string
  agent: OrderAgent
  asset: OrderAsset
  session: OrderSession
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface FiltersResponse {
  agents: { agentId: string; agentName: string }[]
  assets: { assetId: string; symbol: string; name: string }[]
  sessions: { id: string; sessionNumber: number }[]
  orderTypes: string[]
}

type Side = "all" | "market_buy" | "market_sell"

const SIDE_OPTIONS: { label: string; value: Side }[] = [
  { label: "All", value: "all" },
  { label: "Buys", value: "market_buy" },
  { label: "Sells", value: "market_sell" },
]

const PAGE_SIZE = 25

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
  })
}

export default function HistoryPage() {
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [filters, setFilters] = useState<FiltersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [side, setSide] = useState<Side>("all")
  const [agentId, setAgentId] = useState<string>("")
  const [assetId, setAssetId] = useState<string>("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch("/api/orders/filters")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as FiltersResponse
      })
      .then(setFilters)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, side, agentId, assetId])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(PAGE_SIZE))
    if (side !== "all") params.set("orderType", side)
    if (agentId) params.set("agentId", agentId)
    if (assetId) params.set("assetId", assetId)

    fetch(`/api/orders/history?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as OrdersResponse
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to fetch")
      })
    return () => {
      cancelled = true
    }
  }, [page, side, agentId, assetId])

  const rows = useMemo(() => {
    if (!data) return null
    const q = search.trim().toLowerCase()
    if (!q) return data.orders
    return data.orders.filter((o) => {
      return (
        o.agent.agentName.toLowerCase().includes(q) ||
        o.asset.symbol.toLowerCase().includes(q) ||
        o.asset.name.toLowerCase().includes(q) ||
        (o.reasoning ?? "").toLowerCase().includes(q)
      )
    })
  }, [data, search])

  const totalPages = data?.totalPages ?? 1
  const showingFrom = data ? (data.page - 1) * data.limit + 1 : 0
  const showingTo = data ? Math.min(data.page * data.limit, data.total) : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent, ticker, reasoning…"
            className="font-pixel-square w-full rounded-xl bg-background/40 py-2 pl-9 pr-3 text-sm tracking-wide text-foreground outline-none ring-1 ring-black/5 placeholder:text-foreground/40 focus:ring-foreground/30 dark:ring-white/10"
          />
        </div>

        <FilterSelect
          value={agentId}
          onChange={setAgentId}
          placeholder="All agents"
          allLabel="All agents"
          options={
            filters?.agents.map((a) => ({
              value: a.agentId,
              label: a.agentName,
            })) ?? []
          }
        />

        <FilterSelect
          value={assetId}
          onChange={setAssetId}
          placeholder="All assets"
          allLabel="All assets"
          options={
            filters?.assets.map((a) => ({
              value: a.assetId,
              label: `${a.symbol} · ${a.name}`,
            })) ?? []
          }
        />

        <div className="flex gap-1 rounded-xl bg-background/40 p-1 ring-1 ring-black/5 dark:ring-white/10">
          {SIDE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSide(opt.value)}
              className={cn(
                "font-pixel-square rounded-lg px-3 py-1.5 text-xs tracking-wide transition-colors",
                side === opt.value
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-background/40 ring-1 ring-black/5 dark:ring-white/10">
        {error ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/60">
            Failed to load trades · {error}
          </div>
        ) : !rows ? (
          <TradesTableSkeleton />
        ) : rows.length === 0 ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/40">
            No trades match
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/10 hover:bg-transparent">
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
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
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Qty
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Price
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Notional
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Session
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Reasoning
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const isBuy = o.orderType === "market_buy"
                const notional = o.quantity * o.priceAtOrder
                return (
                  <TableRow key={o.id} className="border-foreground/5">
                    <TableCell className="font-pixel-square text-xs text-foreground/60">
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
                      <div className="flex min-w-0 flex-col">
                        <span className="font-pixel-square text-xs text-foreground">
                          {o.asset.symbol}
                        </span>
                        <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                          {o.asset.assetType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground">
                      {fmtQty(o.quantity)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground/80">
                      {fmtUSD(o.priceAtOrder)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground">
                      {fmtUSD(notional)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground/60">
                      #{o.session.sessionNumber}
                    </TableCell>
                    <TableCell className="max-w-[320px]">
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

      {data && data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
            {showingFrom}–{showingTo} of {data.total}
          </span>
          <div className="flex items-center gap-1">
            <PagerButton
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </PagerButton>
            <span className="font-pixel-square px-2 text-[10px] uppercase tracking-wider text-foreground/60">
              Page {page} / {totalPages}
            </span>
            <PagerButton
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </PagerButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  allLabel: string
}) {
  return (
    <Select
      value={value === "" ? "all" : value}
      onValueChange={(v) => onChange(v === "all" ? "" : (v as string))}
    >
      <SelectTrigger
        size="sm"
        className="font-pixel-square min-w-[10rem] rounded-xl border-0 bg-background/40 text-xs tracking-wide ring-1 ring-black/5 hover:bg-background/40 focus-visible:ring-foreground/30 dark:bg-background/40 dark:ring-white/10 dark:hover:bg-background/40"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="font-pixel-square rounded-xl bg-background/95 ring-1 ring-black/5 backdrop-blur-xl dark:bg-background/80 dark:ring-white/10">
        <SelectItem value="all" className="text-xs tracking-wide">
          {allLabel}
        </SelectItem>
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-xs tracking-wide"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "font-pixel-square rounded-lg px-3 py-1.5 text-xs tracking-wide ring-1 ring-black/5 transition-colors dark:ring-white/10",
        disabled
          ? "text-foreground/30"
          : "bg-background/40 text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
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
      {Array.from({ length: 8 }).map((_, i) => (
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
