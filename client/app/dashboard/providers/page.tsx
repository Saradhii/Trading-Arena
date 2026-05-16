"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { BrandLogo } from "@/components/dashboard/brand-logo"

interface ProviderAgent {
  id: string
  agentName: string
  model: string
  parentCompany: string | null
}

interface Provider {
  id: string
  name: string
  baseUrl: string
  agents: ProviderAgent[]
}

type Status = "all" | "active" | "inactive"

const STATUS_OPTIONS: { label: string; value: Status }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[] | null>(null)
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

    fetch(`/api/providers${qs ? `?${qs}` : ""}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as Provider[]
      })
      .then((data) => {
        if (!cancelled) setProviders(data)
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
            placeholder="Search providers or agents…"
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
          Failed to load providers · {error}
        </div>
      ) : !providers ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="font-pixel-square text-sm text-foreground/40">
          No providers match
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProviderCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-[22px] w-[22px] rounded-md" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </div>
      <div className="-mx-4 h-px bg-foreground/10" />
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Skeleton className="h-4 w-4 rounded-md" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-40" />
            </div>
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

function ProviderCard({ provider }: { provider: Provider }) {
  const active = provider.agents.length > 0
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-background/40 p-4 ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrandLogo brand={provider.id} size={22} />
          <h3 className="font-pixel-square text-base capitalize tracking-wide text-foreground">
            {provider.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-pixel-square text-[10px] uppercase tracking-wider text-foreground/40">
            {provider.agents.length} {provider.agents.length === 1 ? "agent" : "agents"}
          </span>
          <span
            aria-hidden
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              active
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
            )}
          />
        </div>
      </div>

      <div className="-mx-4 h-px bg-foreground/10" />

      {!active ? (
        <div className="font-pixel-square text-xs text-foreground/40">
          No agents
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {provider.agents.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5">
              <BrandLogo brand={a.parentCompany ?? a.agentName} size={16} />
              <div className="flex min-w-0 flex-col">
                <span className="font-pixel-square truncate text-sm text-foreground/90">
                  {a.agentName}
                </span>
                <span className="font-pixel-square truncate text-[10px] tracking-wide text-foreground/40">
                  {a.model}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
