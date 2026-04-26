"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  XIcon,
} from "lucide-react"
import OpenAI from "@lobehub/icons/es/OpenAI"
import Meta from "@lobehub/icons/es/Meta"
import Qwen from "@lobehub/icons/es/Qwen"
import Gemini from "@lobehub/icons/es/Gemini"
import ZAI from "@lobehub/icons/es/ZAI"

// ─── Types ───────────────────────────────────────────────────────

interface Order {
  id: string
  agentId: string
  assetId: string
  sessionId: string
  orderType: string
  status: string
  quantity: number
  priceAtOrder: number
  targetPrice: number | null
  reasoning: string | null
  createdAt: string
  executedAt: string | null
  agent: { agentId: string; agentName: string; parentCompany: string | null }
  asset: { id: string; symbol: string; name: string; assetType: string }
  session: { id: string; sessionNumber: number }
}

interface Filters {
  agents: { agentId: string; agentName: string }[]
  assets: { assetId: string; symbol: string; name: string }[]
  sessions: { id: string; sessionNumber: number }[]
  orderTypes: string[]
  statuses: string[]
}

interface HistoryResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Constants ───────────────────────────────────────────────────

const companyIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  OpenAI: OpenAI,
  Meta: Meta.Color,
  Alibaba: Qwen.Color,
  Google: Gemini.Color,
  "Z.ai": ZAI,
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  market_buy: "Market Buy",
  market_sell: "Market Sell",
  limit_buy: "Limit Buy",
  limit_sell: "Limit Sell",
}

const STATUS_STYLES: Record<string, string> = {
  executed: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  cancelled: "bg-red-500/10 text-red-400",
}

function formatCash(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(2)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const PAGE_SIZE = 15

// ─── Page ────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [filters, setFilters] = useState<Filters | null>(null)
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [agentId, setAgentId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [orderType, setOrderType] = useState("")
  const [status, setStatus] = useState("")
  const [sessionId, setSessionId] = useState("")

  useEffect(() => {
    fetch("/api/orders/filters")
      .then((r) => r.json())
      .then(setFilters)
  }, [])

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", String(PAGE_SIZE))
    if (agentId) params.set("agentId", agentId)
    if (assetId) params.set("assetId", assetId)
    if (orderType) params.set("orderType", orderType)
    if (status) params.set("status", status)
    if (sessionId) params.set("sessionId", sessionId)

    fetch(`/api/orders/history?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [page, agentId, assetId, orderType, status, sessionId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const resetFilters = () => {
    setAgentId("")
    setAssetId("")
    setOrderType("")
    setStatus("")
    setSessionId("")
    setPage(1)
  }

  const hasActiveFilters = agentId || assetId || orderType || status || sessionId
  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>History</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="font-pixel-square text-lg">Order History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All trades executed by AI agents across sessions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={agentId} onValueChange={(v) => { setAgentId(v ?? ""); setPage(1) }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              {filters?.agents.map((a) => (
                <SelectItem key={a.agentId} value={a.agentId}>
                  {a.agentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assetId} onValueChange={(v) => { setAssetId(v ?? ""); setPage(1) }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All Assets" />
            </SelectTrigger>
            <SelectContent>
              {filters?.assets.map((a) => (
                <SelectItem key={a.assetId} value={a.assetId}>
                  {a.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={orderType} onValueChange={(v) => { setOrderType(v ?? ""); setPage(1) }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {filters?.orderTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {ORDER_TYPE_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v ?? ""); setPage(1) }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {filters?.statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sessionId} onValueChange={(v) => { setSessionId(v ?? ""); setPage(1) }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent>
              {filters?.sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Session {s.sessionNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 gap-1 text-xs text-muted-foreground">
              <XIcon className="size-3" />
              Clear
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground tabular-nums">
            {data ? `${data.total} order${data.total !== 1 ? "s" : ""}` : ""}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Session</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Agent</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Asset</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Type</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Qty</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Price</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Total</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-widest">Reasoning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                data?.orders.map((order) => {
                  const Icon = companyIcons[order.agent.parentCompany ?? ""]
                  const isBuy = order.orderType.includes("buy")
                  const total = order.quantity * order.priceAtOrder

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        S{order.session.sessionNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-background/60">
                            {Icon ? <Icon size={12} /> : null}
                          </div>
                          <span className="whitespace-nowrap text-sm">{order.agent.agentName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{order.asset.symbol}</span>
                          <span className="text-[10px] text-muted-foreground">{order.asset.assetType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-none text-[10px] px-1.5 py-0 ${
                            isBuy
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {formatCash(order.priceAtOrder)}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {formatCash(total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-none text-[10px] px-1.5 py-0 ${STATUS_STYLES[order.status] ?? ""}`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {order.reasoning ?? "—"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeftIcon className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
