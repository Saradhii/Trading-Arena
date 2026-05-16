"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
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

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/agents").then((r) => r.json()) as Promise<Agent[]>,
      fetch("/api/dashboard/networth-history").then((r) => r.json()) as Promise<NetWorthSeries[]>,
      fetch("/api/dashboard/trades-by-session").then((r) => r.json()) as Promise<TradesBySession[]>,
    ]).then(([a, h, t]) => {
      if (cancelled) return
      setAgents(a)
      setHistory(h)
      setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-3">
      <Panel title="Leaderboard">
        <LeaderboardTable agents={agents} />
      </Panel>
      <Panel title="Net worth over sessions">
        <NetWorthChart history={history} />
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <h3 className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
        {title}
      </h3>
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
                {fmtSignedUSD(pnl)} ({fmtPct(pnlPct)})
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

function NetWorthChart({ history }: { history: NetWorthSeries[] | null }) {
  if (!history) return <Skeleton className="h-full w-full" />
  if (history.length === 0)
    return <EmptyChart label="No snapshots yet" />

  const allPoints = history.flatMap((s) => s.points)
  const sessionNumbers = Array.from(
    new Set(allPoints.map((p) => p.sessionNumber)),
  ).sort((a, b) => a - b)
  if (sessionNumbers.length < 2)
    return <EmptyChart label="Need ≥2 sessions" />

  const minX = sessionNumbers[0]
  const maxX = sessionNumbers[sessionNumbers.length - 1]
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
  const PAD_T = 16
  const PAD_B = 32
  const W = VB_W - PAD_L - PAD_R
  const H = VB_H - PAD_T - PAD_B
  const px = (x: number) => PAD_L + ((x - minX) / (maxX - minX)) * W
  const py = (y: number) => PAD_T + H - ((y - y0) / (y1 - y0)) * H

  const yTicks = niceTicks(y0, y1, 4)
  const xTicks = sessionNumbers
  const tickStep = yTicks.length > 1 ? Math.abs(yTicks[1] - yTicks[0]) : 1
  const fmtTick = (v: number) => {
    if (tickStep >= 1000) return `$${(v / 1000).toFixed(0)}k`
    if (tickStep >= 100) return `$${(v / 1000).toFixed(1)}k`
    if (tickStep >= 10) return `$${(v / 1000).toFixed(2)}k`
    return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  }

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          {history.map((s, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            return (
              <linearGradient
                key={s.agentId}
                id={`grad-${s.agentId}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )
          })}
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
              {fmtTick(t)}
            </text>
          </g>
        ))}

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
            const areaPath =
              linePath +
              ` L ${pts[pts.length - 1].x} ${PAD_T + H}` +
              ` L ${pts[0].x} ${PAD_T + H} Z`
            return (
              <g key={s.agentId}>
                <path d={areaPath} fill={`url(#grad-${s.agentId})`} />
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute right-1 top-0 flex flex-wrap justify-end gap-x-3 gap-y-1 font-pixel-square text-[10px] tracking-wide text-foreground/70">
        {history.map((s, i) => (
          <span key={s.agentId} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {s.agentName}
          </span>
        ))}
      </div>
    </div>
  )
}

function TradesChart({ trades }: { trades: TradesBySession[] | null }) {
  if (!trades) return <Skeleton className="h-full w-full" />
  if (trades.length === 0) return <EmptyChart label="No trades yet" />

  const VB_W = 600
  const VB_H = 320
  const PAD_L = 56
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 32
  const W = VB_W - PAD_L - PAD_R
  const H = VB_H - PAD_T - PAD_B

  const maxCount = Math.max(...trades.map((t) => t.count), 1)
  const yMax = maxCount * 1.15
  const yTicks = niceTicks(0, yMax, 4)
  const yTop = Math.max(yMax, yTicks[yTicks.length - 1] ?? yMax)

  const slot = W / trades.length
  const barW = Math.min(48, slot * 0.45)

  const py = (v: number) => PAD_T + H - (v / yTop) * H
  const xCenter = (i: number) => PAD_L + slot * (i + 0.5)
  const total = trades.reduce((s, t) => s + t.count, 0)

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="font-pixel-square text-[10px] tracking-wide text-foreground/50">
        {total} trades across {trades.length} sessions
      </div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="bar-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.25} />
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

        {trades.map((t, i) => {
          const x = xCenter(i) - barW / 2
          const y = py(t.count)
          const h = PAD_T + H - y
          return (
            <g key={t.sessionNumber}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill="url(#bar-grad)"
                style={{
                  transformOrigin: `${xCenter(i)}px ${PAD_T + H}px`,
                  animation: `bar-grow 0.9s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.08}s both`,
                }}
              />
              <text
                x={xCenter(i)}
                y={y - 8}
                textAnchor="middle"
                className="fill-current text-foreground/70"
                fontSize={11}
                style={{
                  animation: `fade-in 0.4s ease-out ${0.6 + i * 0.08}s both`,
                }}
              >
                {t.count}
              </text>
              <text
                x={xCenter(i)}
                y={PAD_T + H + 18}
                textAnchor="middle"
                className="fill-current text-foreground/50"
                fontSize={11}
              >
                #{t.sessionNumber}
              </text>
            </g>
          )
        })}

        <style>{`
          @keyframes bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </svg>
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
    { symbol: "CASH", value: cash, color: "#94a3b8" },
    ...Array.from(bySymbol.entries())
      .map(([symbol, value], i) => ({
        symbol,
        value,
        color: SERIES_COLORS[(i + 1) % SERIES_COLORS.length],
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

      <div className="grid min-h-0 flex-1 grid-cols-[60%_1fr] items-center gap-4 overflow-hidden">
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
      <span className="font-pixel-square text-xs tracking-wide text-foreground/90">
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
