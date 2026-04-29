"use client"

import { Fragment, useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts"
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
import {
  useGridBeam,
  GridBeamDividers,
  GridBeamCanvas,
} from "@/components/ui/grid-beam"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useIsMobile } from "@/hooks/use-mobile"
import OpenAI from "@lobehub/icons/es/OpenAI"
import Meta from "@lobehub/icons/es/Meta"
import Qwen from "@lobehub/icons/es/Qwen"
import Gemini from "@lobehub/icons/es/Gemini"
import ZAI from "@lobehub/icons/es/ZAI"

interface Stats {
  totalAUM: number
  totalSessions: number
  totalTrades: number
  bestPerformer: { agentName: string; netWorth: number }
}

interface LeaderboardEntry {
  agentId: string
  agentName: string
  parentCompany: string
  cashBalance: number
  portfolioValue: number
  netWorth: number
  rank: number
}

interface NetWorthSnapshot {
  sessionId: string
  cashBalance: number
  portfolioValue: number
  netWorth: number
  createdAt: string
}

interface RecentOrder {
  orderType: string
  quantity: number
  priceAtOrder: number
  reasoning: string
  createdAt: string
  agent: { agentName: string; parentCompany: string }
  asset: { symbol: string; name: string }
}

interface RecentOrdersResponse {
  sessionNumber: number
  completedAt: string
  orders: RecentOrder[]
}

const companyIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  OpenAI: OpenAI,
  Meta: Meta.Color,
  Alibaba: Qwen.Color,
  Google: Gemini.Color,
  "Z.ai": ZAI,
}

const AGENT_COLORS: Record<string, string> = {
  "GPT-OSS-120B": "oklch(0.75 0.1 160)",
  "Llama-4-Scout": "oklch(0.7 0.15 250)",
  "Qwen-3-235B": "oklch(0.7 0.12 30)",
  "Gemini-3-Flash": "oklch(0.75 0.1 290)",
  "GLM-5.1": "oklch(0.7 0 0)",
}

function formatCash(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

function NetWorthChart({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[]
}) {
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (leaderboard.length === 0) return

    Promise.all(
      leaderboard.map((agent) =>
        fetch(`/api/leaderboard/history/${agent.agentId}`)
          .then((r) => r.json())
          .then((snapshots: NetWorthSnapshot[]) => ({
            agentName: agent.agentName,
            snapshots: snapshots.reverse(),
          }))
      )
    ).then((results) => {
      const maxLen = Math.max(...results.map((r) => r.snapshots.length))
      const merged: Record<string, unknown>[] = []

      for (let i = 0; i < maxLen; i++) {
        const point: Record<string, unknown> = { session: i + 1 }
        for (const { agentName, snapshots } of results) {
          point[agentName] = snapshots[i]?.netWorth ?? null
        }
        merged.push(point)
      }

      setChartData(merged)
      setLoading(false)
    })
  }, [leaderboard])

  const chartConfig: ChartConfig = {}
  leaderboard.forEach((agent) => {
    chartConfig[agent.agentName] = {
      label: agent.agentName,
      color: AGENT_COLORS[agent.agentName] ?? "oklch(0.6 0 0)",
    }
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="font-pixel-square text-sm">
          Net Worth
        </CardTitle>
        <CardDescription>
          Portfolio performance across all sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[260px] flex-1 w-full">
          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="session"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
              tickFormatter={(v) => `S${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
              tickFormatter={(v) => formatCash(v)}
              width={52}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            {leaderboard.map((agent) => (
              <Line
                key={agent.agentId}
                dataKey={agent.agentName}
                type="monotone"
                stroke={`var(--color-${agent.agentName.replace(/[\s.]/g, "-")})`}
                strokeWidth={2}
                dot={false}
                filter="url(#line-glow)"
              />
            ))}
            <defs>
              <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function LeaderboardCard({
  leaderboard,
}: {
  leaderboard: LeaderboardEntry[]
}) {
  const isMobile = useIsMobile()
  const cols = isMobile ? 3 : 4
  const rows = leaderboard.length + 1
  const maxNetWorth = Math.max(...leaderboard.map((a) => a.netWorth), 100_000)

  const { canvasRef } = useGridBeam({
    rows,
    cols,
    colorVariant: "colorful",
    theme: "dark",
    active: true,
    duration: 3.4,
    strength: 1,
    breathe: true,
  })

  const headers = isMobile
    ? (["#", "Model", "P&L"] as const)
    : (["Rank", "Model", "Net Worth", "P&L"] as const)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="font-pixel-square text-sm">Leaderboard</CardTitle>
        <CardDescription>Agent rankings by net worth</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pb-4">
      <div
        className="relative flex-1 overflow-hidden border border-border bg-card/40"
        style={{ borderRadius: 12 }}
      >
        <GridBeamDividers cols={cols} rows={rows} />
        <GridBeamCanvas borderRadius={12} ref={canvasRef} />
        <div
          className="relative z-3 grid h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {headers.map((h) => (
            <div
              key={h}
              className={`flex items-center font-semibold text-[10.5px] text-muted-foreground uppercase tracking-widest ${isMobile ? "px-2" : "px-4"}`}
            >
              {h}
            </div>
          ))}

          {leaderboard.map((agent) => {
            const Icon = companyIcons[agent.parentCompany]
            const pnl = agent.netWorth - 100_000
            const pnlPositive = pnl >= 0
            const pnlPct = ((pnl / 100_000) * 100).toFixed(1)
            const barPct = (agent.netWorth / maxNetWorth) * 100
            const color = AGENT_COLORS[agent.agentName] ?? "oklch(0.6 0 0)"

            if (isMobile) {
              return (
                <Fragment key={agent.agentId}>
                  <div className="flex items-center px-2 font-pixel-square text-xs text-muted-foreground">
                    #{agent.rank}
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-background/60">
                      {Icon ? <Icon size={12} /> : null}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs">{agent.agentName}</span>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        {formatCash(agent.netWorth)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span
                      className={`min-w-[32px] text-right text-[10px] tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {pnlPositive ? "+" : ""}{pnlPct}%
                    </span>
                  </div>
                </Fragment>
              )
            }

            return (
              <Fragment key={agent.agentId}>
                <div className="flex items-center px-4 font-pixel-square text-sm text-muted-foreground">
                  #{agent.rank}
                </div>
                <div className="flex items-center gap-2.5 px-4">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-background/60">
                    {Icon ? <Icon size={14} /> : null}
                  </div>
                  <span className="truncate text-sm">{agent.agentName}</span>
                </div>
                <div className="flex items-center px-4 font-mono text-sm tabular-nums">
                  {formatCash(agent.netWorth)}
                </div>
                <div className="flex items-center gap-2.5 px-4">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span
                    className={`min-w-[40px] text-right text-[11px] tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {pnlPositive ? "+" : ""}{pnlPct}%
                  </span>
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>
      </CardContent>
    </Card>
  )
}

const ASSET_COLORS = [
  "oklch(0.7 0.15 160)",
  "oklch(0.7 0.15 250)",
  "oklch(0.7 0.12 30)",
  "oklch(0.75 0.1 290)",
  "oklch(0.7 0.1 80)",
  "oklch(0.65 0.12 200)",
  "oklch(0.72 0.1 340)",
  "oklch(0.68 0.14 120)",
]

function AssetDistributionChart({
  data,
}: {
  data: RecentOrdersResponse | null
}) {
  if (!data || data.orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-pixel-square text-sm">Asset Distribution</CardTitle>
          <CardDescription>No trades yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const assetVolumes: Record<string, number> = {}
  for (const order of data.orders) {
    const symbol = order.asset.symbol
    assetVolumes[symbol] = (assetVolumes[symbol] ?? 0) + order.quantity * order.priceAtOrder
  }

  const chartData = Object.entries(assetVolumes)
    .map(([symbol, volume], i) => ({
      symbol,
      volume,
      fill: ASSET_COLORS[i % ASSET_COLORS.length],
    }))
    .sort((a, b) => b.volume - a.volume)

  const chartConfig: ChartConfig = {}
  chartData.forEach((d) => {
    chartConfig[d.symbol] = { label: d.symbol, color: d.fill }
  })

  const totalVolume = chartData.reduce((s, d) => s + d.volume, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-pixel-square text-sm">
          Asset Distribution
          <Badge
            variant="outline"
            className="ml-2 border-none bg-muted text-muted-foreground"
          >
            Session {data.sessionNumber}
          </Badge>
        </CardTitle>
        <CardDescription>Trade volume by asset</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? formatCash(value) : String(value)
                  }
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="volume"
              nameKey="symbol"
              innerRadius={50}
              outerRadius={80}
              strokeWidth={2}
              stroke="oklch(0.205 0 0)"
            />
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground font-mono text-lg font-medium"
            >
              {formatCash(totalVolume)}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              total volume
            </text>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function AllocationChart({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const isMobile = useIsMobile()

  const data = leaderboard.map((a) => ({
    agent: a.agentName,
    cash: a.cashBalance,
    invested: a.portfolioValue,
  }))

  const chartConfig: ChartConfig = {
    cash: { label: "Cash", color: "oklch(0.55 0.15 280)" },
    invested: { label: "Invested", color: "oklch(0.7 0.18 200)" },
  }

  const tickFormatter = (label: string) => {
    if (!isMobile) return label
    const parts = label.split("-")
    if (parts.length <= 2) return label
    return parts.slice(0, 2).join("-")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-pixel-square text-sm">Allocation</CardTitle>
        <CardDescription>Cash vs invested per agent</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[220px] sm:h-[250px] w-full max-w-[320px] sm:max-w-none">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={isMobile ? "62%" : "70%"}>
            <PolarGrid
              stroke="oklch(1 0 0 / 10%)"
              radialLines={true}
            />
            <PolarAngleAxis
              dataKey="agent"
              tick={{ fontSize: isMobile ? 9 : 11, fill: "oklch(0.55 0 0)" }}
              tickLine={false}
              tickFormatter={tickFormatter}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number" ? formatCash(value) : String(value)
                  }
                />
              }
            />
            <Radar
              dataKey="invested"
              stroke="var(--color-invested)"
              fill="var(--color-invested)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              dataKey="cash"
              stroke="var(--color-cash)"
              fill="var(--color-cash)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrdersResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
      fetch("/api/dashboard/recent-orders").then((r) => r.json()),
    ])
      .then(([s, l, o]) => {
        setStats(s)
        setLeaderboard(l)
        setRecentOrders(o)
      })
      .finally(() => setLoading(false))
  }, [])

  const aum = stats?.totalAUM ?? 0
  const pnl = aum - 5 * 100_000
  const pnlPositive = pnl >= 0

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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-3 pt-0 sm:gap-4 sm:p-4 sm:pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total AUM</CardDescription>
              <CardTitle className="font-pixel-square text-lg tabular-nums">
                {loading ? <Skeleton className="h-5 w-20" /> : formatCash(aum)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total P&L</CardDescription>
              <CardTitle className={`font-pixel-square text-lg tabular-nums ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {loading ? <Skeleton className="h-5 w-20" /> : `${pnlPositive ? "+" : ""}${formatCash(pnl)}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sessions</CardDescription>
              <CardTitle className="font-pixel-square text-lg tabular-nums">
                {loading ? <Skeleton className="h-5 w-12" /> : stats?.totalSessions ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Best Performer</CardDescription>
              <CardTitle className="font-pixel-square text-lg">
                {loading ? (
                  <Skeleton className="h-5 w-24" />
                ) : stats?.bestPerformer ? (
                  <span className="truncate">
                    {stats.bestPerformer.agentName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatCash(stats.bestPerformer.netWorth)}
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <LeaderboardCard leaderboard={leaderboard} />
          </div>
          <div className="flex flex-col">
            <NetWorthChart leaderboard={leaderboard} />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <AllocationChart leaderboard={leaderboard} />
          </div>
          <div className="lg:col-span-3">
            <AssetDistributionChart data={recentOrders} />
          </div>
        </div>
      </div>
    </>
  )
}
