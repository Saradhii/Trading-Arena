"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
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

interface SessionTradeCount {
  sessionId: string
  sessionNumber: number
  count: number
}

type StatusFilter = "all" | "running" | "completed"

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
]

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function TradesPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>("all")

  useEffect(() => {
    let cancelled = false
    setError(null)

    Promise.all([
      fetch("/api/sessions").then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as Session[]
      }),
      fetch("/api/dashboard/trades-by-session").then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as SessionTradeCount[]
      }),
    ])
      .then(([s, c]) => {
        if (cancelled) return
        setSessions(s)
        setCounts(new Map(c.map((x) => [x.sessionId, x.count])))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to fetch")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    if (!sessions) return null
    if (status === "all") return sessions
    return sessions.filter((s) => s.status === status)
  }, [sessions, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="font-pixel-square text-lg tracking-wide text-foreground">
            Trading Sessions
          </h1>
          <span className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
            Select a session to inspect its trades
          </span>
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

      <div className="overflow-hidden rounded-xl bg-background/40 ring-1 ring-black/5 dark:ring-white/10">
        {error ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/60">
            Failed to load sessions · {error}
          </div>
        ) : !rows ? (
          <SessionsTableSkeleton />
        ) : rows.length === 0 ? (
          <div className="font-pixel-square p-6 text-sm text-foreground/40">
            No sessions match
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/10 hover:bg-transparent">
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Session
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Started
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Completed
                </TableHead>
                <TableHead className="font-pixel-square text-[10px] uppercase tracking-wider">
                  Duration
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  Trades
                </TableHead>
                <TableHead className="font-pixel-square text-right text-[10px] uppercase tracking-wider">
                  {""}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const isRunning = s.status === "running"
                const tradeCount = counts.get(s.id) ?? 0
                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer border-foreground/5"
                    onClick={() =>
                      router.push(`/dashboard/trades/${s.sessionNumber}`)
                    }
                  >
                    <TableCell className="font-pixel-square text-sm text-foreground">
                      #{s.sessionNumber}
                    </TableCell>
                    <TableCell>
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
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-pixel-square text-xs text-foreground/60">
                      {fmtTime(s.startedAt)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-xs text-foreground/60">
                      {s.completedAt ? fmtTime(s.completedAt) : "—"}
                    </TableCell>
                    <TableCell className="font-pixel-square text-xs text-foreground/80">
                      {fmtDuration(s.startedAt, s.completedAt)}
                    </TableCell>
                    <TableCell className="font-pixel-square text-right text-xs text-foreground">
                      {tradeCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/trades/${s.sessionNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-pixel-square inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground"
                      >
                        View
                        <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function SessionsTableSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-3 border-b border-foreground/10 px-3 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-foreground/5 px-3 py-3 last:border-0"
        >
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      ))}
    </div>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
