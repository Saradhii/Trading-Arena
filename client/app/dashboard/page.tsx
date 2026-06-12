"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { excludeBaselineAgents } from "@/lib/agents"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLogo } from "@/components/dashboard/brand-logo"

interface Holding {
  symbol: string
  currentValue: number
}

interface Agent {
  id: string
  agentName: string
  provider: string
  parentCompany: string | null
  cashBalance: number
  portfolioValue: number
  netWorth: number
  holdings: Holding[]
  active: boolean
}

interface NetWorthSeries {
  agentId: string
  agentName: string
  points: { sessionNumber: number; netWorth: number }[]
}

interface TradesBySession {
  sessionNumber: number
  count: number
}

const INITIAL_CASH = 100000

const SERIES_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
]

const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const fmtSignedUSD = (n: number) => {
  const sign = n > 0 ? "+" : n < 0 ? "-" : ""
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`
}
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [history, setHistory] = useState<NetWorthSeries[] | null>(null)
  const [trades, setTrades] = useState<TradesBySession[] | null>(null)
  const [netWorthView, setNetWorthView] = useState<"grid" | "overlay">("grid")

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/agents").then((r) => r.json()) as Promise<Agent[]>,
      fetch("/api/dashboard/networth-history").then((r) => r.json()) as Promise<NetWorthSeries[]>,
      fetch("/api/dashboard/trades-by-session").then((r) => r.json()) as Promise<TradesBySession[]>,
    ]).then(([a, h, t]) => {
      if (cancelled) return
      setAgents(excludeBaselineAgents(a))
      setHistory(excludeBaselineAgents(h))
      setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="grid grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-2 lg:grid-rows-2">
      <Panel title="Leaderboard">
        <LeaderboardTable agents={agents} />
      </Panel>
      <Panel
        title="Net worth over sessions"
        action={
          history && history.length > 0 ? (
            <NetWorthViewToggle view={netWorthView} setView={setNetWorthView} />
          ) : null
        }
      >
        <NetWorthChart
          history={history}
          agents={agents}
          view={netWorthView}
        />
      </Panel>
      <Panel title="Trades per session">
        <TradesChart trades={trades} />
      </Panel>
      <Panel title="Asset allocation">
        <AssetAllocation agents={agents} />
      </Panel>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[300px] min-w-0 flex-col gap-2 overflow-hidden rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10 lg:min-h-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
          {title}
        </h3>
        {action}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}

function LeaderboardTable({ agents }: { agents: Agent[] | null }) {
  if (!agents) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    )
  }
  const sorted = [...agents].sort((a, b) => b.netWorth - a.netWorth).slice(0, 5)
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid grid-cols-[20px_1fr_auto_auto] gap-3 font-pixel-square pb-2 text-[10px] uppercase tracking-wider text-foreground/40">
        <span>#</span>
        <span>Agent</span>
        <span className="text-right">Net worth</span>
        <span className="text-right">P&amp;L</span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col divide-y divide-foreground/5">
        {sorted.map((a, i) => {
          const pnl = a.netWorth - INITIAL_CASH
          const pnlPct = (pnl / INITIAL_CASH) * 100
          const up = pnl >= 0
          return (
            <li
              key={a.id}
              className="grid flex-1 grid-cols-[20px_1fr_auto_auto] items-center gap-3 font-pixel-square text-xs"
            >
              <span className="text-foreground/40">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-2">
                <BrandLogo brand={a.parentCompany ?? a.provider} size={14} />
                <span className="truncate text-foreground/90">{a.agentName}</span>
              </span>
              <span className="text-right text-foreground/90">{fmtUSD(a.netWorth)}</span>
              <span
                className={cn(
                  "text-right text-[10px] tracking-wide",
                  up ? "text-emerald-500" : "text-red-500",
                )}
              >
                {fmtSignedUSD(pnl)}
                <span className="hidden sm:inline"> ({fmtPct(pnlPct)})</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ""
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  const p = (i: number) =>
    points[Math.max(0, Math.min(points.length - 1, i))]
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = p(i - 1)
    const p1 = p(i)
    const p2 = p(i + 1)
    const p3 = p(i + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function niceTicks(min: number, max: number, count = 4) {
  const range = max - min
  const rough = range / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * pow
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(v)
  return ticks
}

function NetWorthChart({
  history,
  agents,
  view,
}: {
  history: NetWorthSeries[] | null
  agents: Agent[] | null
  view: "grid" | "overlay"
}) {
  if (!history) return <Skeleton className="h-full w-full" />
  if (history.length === 0)
    return <EmptyChart label="No snapshots yet" />

  const allPoints = history.flatMap((s) => s.points)
  const sessionNumbers = Array.from(
    new Set(allPoints.map((p) => p.sessionNumber)),
  ).sort((a, b) => a - b)
  if (sessionNumbers.length < 2)
    return <EmptyChart label="Need ≥2 sessions" />

  const brandFor = (agentId: string) => {
    const a = agents?.find((x) => x.id === agentId)
    return a ? a.parentCompany ?? a.provider : null
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {view === "grid" ? (
        <NetWorthSparklines history={history} brandFor={brandFor} />
      ) : (
        <NetWorthOverlay history={history} sessionNumbers={sessionNumbers} />
      )}
    </div>
  )
}

function NetWorthViewToggle({
  view,
  setView,
}: {
  view: "grid" | "overlay"
  setView: (v: "grid" | "overlay") => void
}) {
  return (
    <div className="inline-flex items-center rounded-md p-0.5 ring-1 ring-foreground/10">
      {(["grid", "overlay"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={cn(
            "rounded px-2 py-0.5 font-pixel-square text-[10px] uppercase tracking-wider transition-colors",
            view === id
              ? "bg-foreground/10 text-foreground/90"
              : "text-foreground/40 hover:text-foreground/70",
          )}
        >
          {id}
        </button>
      ))}
    </div>
  )
}

function NetWorthSparklines({
  history,
  brandFor,
}: {
  history: NetWorthSeries[]
  brandFor: (id: string) => string | null
}) {
  const allPoints = history.flatMap((s) => s.points)
  const values = allPoints.map((p) => p.netWorth)
  const minY = Math.min(...values, INITIAL_CASH)
  const maxY = Math.max(...values, INITIAL_CASH)
  const padY = (maxY - minY) * 0.15 || INITIAL_CASH * 0.005
  const y0 = minY - padY
  const y1 = maxY + padY

  const gridCols =
    history.length >= 5
      ? "grid-cols-2 xl:grid-cols-3"
      : history.length >= 3
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1"

  return (
    <div
      className={cn(
        "grid min-h-0 auto-rows-[110px] gap-2 lg:h-full lg:auto-rows-fr",
        gridCols,
      )}
    >
      {history.map((s, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length]
        const sorted = [...s.points].sort(
          (a, b) => a.sessionNumber - b.sessionNumber,
        )
        const current = sorted[sorted.length - 1]?.netWorth ?? INITIAL_CASH
        const pnl = current - INITIAL_CASH
        const pnlPct = (pnl / INITIAL_CASH) * 100
        const up = pnl >= 0
        const brand = brandFor(s.agentId)

        const VW = 200
        const VH = 60
        const minS = sorted[0]?.sessionNumber ?? 0
        const maxS = sorted[sorted.length - 1]?.sessionNumber ?? 1
        const xRange = Math.max(1, maxS - minS)
        const pts = sorted.map((p) => ({
          x: ((p.sessionNumber - minS) / xRange) * VW,
          y: VH - ((p.netWorth - y0) / (y1 - y0)) * VH,
        }))
        const line = smoothPath(pts)
        const baselineY =
          VH - ((INITIAL_CASH - y0) / (y1 - y0)) * VH

        return (
          <div
            key={s.agentId}
            className="flex min-h-0 flex-col gap-1.5 rounded-lg bg-foreground/[0.03] p-2 ring-1 ring-inset ring-foreground/5"
          >
            <div className="flex min-w-0 items-center gap-1.5 font-pixel-square text-[10px]">
              {brand ? (
                <BrandLogo brand={brand} size={12} />
              ) : (
                <span className="h-3 w-3" />
              )}
              <span className="min-w-0 flex-1 truncate text-foreground/80">
                {s.agentName}
              </span>
              <span className="text-foreground/60">{fmtUSD(current)}</span>
            </div>
            <div className="relative min-h-0 flex-1">
              <svg
                viewBox={`0 0 ${VW} ${VH}`}
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                <line
                  x1={0}
                  x2={VW}
                  y1={baselineY}
                  y2={baselineY}
                  stroke="currentColor"
                  strokeOpacity={0.18}
                  strokeDasharray="3 4"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={line}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div
              className={cn(
                "text-right font-pixel-square text-[10px] tracking-wide",
                up ? "text-emerald-500" : "text-red-500",
              )}
            >
              {fmtSignedUSD(pnl)} ({fmtPct(pnlPct)})
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NetWorthOverlay({
  history,
  sessionNumbers,
}: {
  history: NetWorthSeries[]
  sessionNumbers: number[]
}) {
  const [focus, setFocus] = useState<string | null>(null)

  const minX = sessionNumbers[0]
  const maxX = sessionNumbers[sessionNumbers.length - 1]
  const allPoints = history.flatMap((s) => s.points)
  const values = allPoints.map((p) => p.netWorth)
  const minY = Math.min(...values, INITIAL_CASH)
  const maxY = Math.max(...values, INITIAL_CASH)
  const padY = (maxY - minY) * 0.15 || INITIAL_CASH * 0.005
  const y0 = minY - padY
  const y1 = maxY + padY

  const VB_W = 600
  const VB_H = 320
  const PAD_L = 56
  const PAD_R = 16
  const PAD_T = 28
  const PAD_B = 32
  const W = VB_W - PAD_L - PAD_R
  const H = VB_H - PAD_T - PAD_B
  const px = (x: number) => PAD_L + ((x - minX) / (maxX - minX)) * W
  const py = (y: number) => PAD_T + H - ((y - y0) / (y1 - y0)) * H

  const yTicks = niceTicks(y0, y1, 4)
  const tickStep = yTicks.length > 1 ? Math.abs(yTicks[1] - yTicks[0]) : 1
  const fmtTick = (v: number) => {
    if (tickStep >= 1000) return `$${(v / 1000).toFixed(0)}k`
    if (tickStep >= 100) return `$${(v / 1000).toFixed(1)}k`
    if (tickStep >= 10) return `$${(v / 1000).toFixed(2)}k`
    return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  }

  const xStep = Math.max(1, Math.ceil(sessionNumbers.length / 7))
  const xTicks = sessionNumbers.filter(
    (_, i) => i % xStep === 0 || i === sessionNumbers.length - 1,
  )
  const baselineY = py(INITIAL_CASH)

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <clipPath id="nw-reveal">
              <rect x={PAD_L} y={0} height={VB_H} width={0}>
                <animate
                  attributeName="width"
                  from="0"
                  to={W}
                  dur="1.1s"
                  begin="0.05s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.22 1 0.36 1"
                  keyTimes="0;1"
                  values={`0;${W}`}
                />
              </rect>
            </clipPath>
          </defs>

          {yTicks.map((t) => (
            <g key={`yt-${t}`}>
              <line
                x1={PAD_L}
                x2={PAD_L + W}
                y1={py(t)}
                y2={py(t)}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={py(t)}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-current text-foreground/50"
                fontSize={11}
              >
                {fmtTick(t)}
              </text>
            </g>
          ))}

          <line
            x1={PAD_L}
            x2={PAD_L + W}
            y1={baselineY}
            y2={baselineY}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={1}
          />

          {xTicks.map((s) => (
            <text
              key={`xt-${s}`}
              x={px(s)}
              y={PAD_T + H + 18}
              textAnchor="middle"
              className="fill-current text-foreground/50"
              fontSize={11}
            >
              #{s}
            </text>
          ))}

          <g clipPath="url(#nw-reveal)">
            {history.map((s, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              const sorted = [...s.points].sort(
                (a, b) => a.sessionNumber - b.sessionNumber,
              )
              const pts = sorted.map((p) => ({
                x: px(p.sessionNumber),
                y: py(p.netWorth),
              }))
              const linePath = smoothPath(pts)
              const dim = focus !== null && focus !== s.agentId
              const isFocus = focus === s.agentId
              return (
                <path
                  key={s.agentId}
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={isFocus ? 3 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={dim ? 0.15 : 1}
                  style={{
                    transition:
                      "opacity 0.15s ease-out, stroke-width 0.15s ease-out",
                  }}
                />
              )
            })}
          </g>
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-pixel-square text-[10px] tracking-wide text-foreground/70">
        {history.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length]
          const dim = focus !== null && focus !== s.agentId
          return (
            <button
              key={s.agentId}
              type="button"
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: dim ? 0.4 : 1 }}
              onMouseEnter={() => setFocus(s.agentId)}
              onMouseLeave={() => setFocus(null)}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: color }}
              />
              {s.agentName}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TradesChart({ trades }: { trades: TradesBySession[] | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  if (!trades) return <Skeleton className="h-full w-full" />
  if (trades.length === 0) return <EmptyChart label="No trades yet" />

  const sorted = [...trades].sort((a, b) => a.sessionNumber - b.sessionNumber)

  // Group sessions into at most 12 buckets so every bar is chunky and labeled
  const bucketSize = Math.ceil(sorted.length / 12)
  const buckets: {
    start: number
    end: number
    total: number
    sessions: number
  }[] = []
  for (let i = 0; i < sorted.length; i += bucketSize) {
    const chunk = sorted.slice(i, i + bucketSize)
    buckets.push({
      start: chunk[0].sessionNumber,
      end: chunk[chunk.length - 1].sessionNumber,
      total: chunk.reduce((s, t) => s + t.count, 0),
      sessions: chunk.length,
    })
  }

  const VB_W = 600
  const VB_H = 320
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 30
  const PAD_B = 28
  const W = VB_W - PAD_L - PAD_R
  const H = VB_H - PAD_T - PAD_B

  const total = sorted.reduce((s, t) => s + t.count, 0)
  const avgPerSession = total / sorted.length

  const maxBucket = Math.max(...buckets.map((b) => b.total), 1)
  const yTop = Math.ceil(maxBucket * 1.2)
  const yTicks = niceTicks(0, yTop, 4).filter((t) => t > 0)
  const py = (v: number) => PAD_T + H - (v / yTop) * H

  const slot = W / buckets.length
  const barW = Math.min(48, slot * 0.62)
  const xCenter = (i: number) => PAD_L + slot * (i + 0.5)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const i = Math.floor(((x / rect.width) * VB_W - PAD_L) / slot)
    if (i >= 0 && i < buckets.length) {
      setHover(i)
      setCursor({ x, y: e.clientY - rect.top })
    } else {
      setHover(null)
      setCursor(null)
    }
  }

  return (
    <div
      className="relative h-full w-full"
      onMouseMove={onMove}
      onMouseLeave={() => {
        setHover(null)
        setCursor(null)
      }}
    >
      <div className="pointer-events-none absolute right-0 top-0 z-10 font-pixel-square text-[10px] tracking-wide text-foreground/50">
        {total} trades · {sorted.length} sessions · ~{avgPerSession.toFixed(1)}/session
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="tps-bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.45} />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={`yt-${t}`}>
            <line
              x1={PAD_L}
              x2={PAD_L + W}
              y1={py(t)}
              y2={py(t)}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={py(t)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-current text-foreground/50"
              fontSize={11}
            >
              {Math.round(t)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_L}
          x2={PAD_L + W}
          y1={PAD_T + H}
          y2={PAD_T + H}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={1}
        />

        {buckets.map((b, i) => {
          const y = py(b.total)
          return (
            <g key={b.start}>
              <g
                style={{
                  transformOrigin: `${xCenter(i)}px ${PAD_T + H}px`,
                  animation: `tps-grow 0.7s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.04}s both`,
                }}
              >
                <rect
                  x={xCenter(i) - barW / 2}
                  y={y}
                  width={barW}
                  height={PAD_T + H - y}
                  rx={3}
                  fill={hover === i ? "#10b981" : "url(#tps-bar)"}
                />
              </g>
              <text
                x={xCenter(i)}
                y={y - 8}
                textAnchor="middle"
                className="fill-current text-foreground/70"
                fontSize={11}
                style={{ animation: `tps-fade 0.4s ease-out ${0.4 + i * 0.04}s both` }}
              >
                {b.total}
              </text>
              <text
                x={xCenter(i)}
                y={PAD_T + H + 18}
                textAnchor="middle"
                className="fill-current text-foreground/50"
                fontSize={11}
              >
                #{b.start}
              </text>
            </g>
          )
        })}

        <style>{`
          @keyframes tps-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @keyframes tps-fade { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </svg>

      {hover !== null && cursor && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-background/95 px-2.5 py-1.5 font-pixel-square text-[11px] tracking-wide text-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <div>
            {buckets[hover].sessions > 1
              ? `Sessions #${buckets[hover].start}–#${buckets[hover].end}`
              : `Session #${buckets[hover].start}`}
          </div>
          <div className="text-foreground/60">
            {buckets[hover].total} {buckets[hover].total === 1 ? "trade" : "trades"}
            {buckets[hover].sessions > 1
              ? ` · ${(buckets[hover].total / buckets[hover].sessions).toFixed(1)}/session`
              : ""}
          </div>
        </div>
      )}
    </div>
  )
}

function AssetAllocation({ agents }: { agents: Agent[] | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  if (!agents) return <Skeleton className="h-full w-full" />

  let cash = 0
  const bySymbol = new Map<string, number>()
  for (const a of agents) {
    cash += a.cashBalance
    for (const h of a.holdings) {
      bySymbol.set(h.symbol, (bySymbol.get(h.symbol) ?? 0) + h.currentValue)
    }
  }
  const rows = [
    // CASH owns emerald (money green); holdings cycle the rest of the palette
    { symbol: "CASH", value: cash, color: "#10b981" },
    ...Array.from(bySymbol.entries())
      .map(([symbol, value], i) => ({
        symbol,
        value,
        color: SERIES_COLORS[1 + (i % (SERIES_COLORS.length - 1))],
      }))
      .sort((a, b) => b.value - a.value),
  ]
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) return <EmptyChart label="No assets yet" />

  const VB = 200
  const cx = VB / 2
  const cy = VB / 2
  const R = 92
  const r = R / 2
  const thickness = R
  const circ = 2 * Math.PI * r

  let cumulative = 0
  const segments = rows.map((row) => {
    const frac = row.value / total
    const dash = frac * circ
    const offset = -cumulative * circ
    cumulative += frac
    return { ...row, frac, dash, offset, pct: frac * 100 }
  })

  const agentCount = agents.length
  const activeAgents = agents.filter((a) => a.active).length
  const top = segments[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total AUM" value={fmtUSD(total)} />
        <Stat label="Agents" value={`${activeAgents}/${agentCount}`} />
        <Stat label="Top" value={`${top.symbol} ${top.pct.toFixed(0)}%`} />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[50%_1fr] items-center gap-3 overflow-hidden sm:grid-cols-[60%_1fr] sm:gap-4">
        <div
          className="relative h-full min-h-0 w-full"
          onMouseLeave={() => {
            setHover(null)
            setCursor(null)
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }}
        >
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full -rotate-90"
          >
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.06}
              strokeWidth={thickness}
            />
            {segments.map((s, i) => {
              const dim = hover !== null && hover !== i
              return (
                <circle
                  key={s.symbol}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeLinecap="butt"
                  strokeDasharray={`0 ${circ}`}
                  strokeDashoffset={s.offset}
                  opacity={dim ? 0.3 : 1}
                  style={{
                    animation: `pie-grow-${i} 0.9s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.1}s forwards`,
                    transition: "opacity 0.15s ease-out",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHover(i)}
                />
              )
            })}
            <style>
              {segments
                .map(
                  (s, i) =>
                    `@keyframes pie-grow-${i} { to { stroke-dasharray: ${s.dash} ${circ}; } }`,
                )
                .join("\n")}
            </style>
          </svg>

          {hover !== null && cursor && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md bg-background/95 px-2.5 py-1.5 font-pixel-square text-[11px] tracking-wide text-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur"
              style={{ left: cursor.x, top: cursor.y }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: segments[hover].color }}
                />
                <span>{segments[hover].symbol}</span>
              </div>
              <div className="text-foreground/60">
                {fmtUSD(segments[hover].value)} · {segments[hover].pct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        <ul className="flex min-h-0 flex-col gap-1 overflow-hidden">
          {segments.map((s, i) => {
            const dim = hover !== null && hover !== i
            return (
              <li
                key={s.symbol}
                className="grid cursor-pointer grid-cols-[10px_1fr_auto] items-center gap-2 rounded font-pixel-square text-[11px] tracking-wide transition-opacity"
                style={{ opacity: dim ? 0.4 : 1 }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-foreground/80">{s.symbol}</span>
                <span className="text-right text-foreground/50">
                  {fmtUSD(s.value)} · {s.pct.toFixed(1)}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
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

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center font-pixel-square text-[10px] uppercase tracking-wider text-foreground/30">
      {label}
    </div>
  )
}
