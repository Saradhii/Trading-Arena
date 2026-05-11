"use client"

import { useEffect, useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useGridBeam,
  GridBeamDividers,
  GridBeamCanvas,
  GridBeamContent,
} from "@/components/ui/grid-beam"
import OpenAI from "@lobehub/icons/es/OpenAI"
import Meta from "@lobehub/icons/es/Meta"
import Qwen from "@lobehub/icons/es/Qwen"
import Gemini from "@lobehub/icons/es/Gemini"
import ZAI from "@lobehub/icons/es/ZAI"

interface Agent {
  id: string
  agentName: string
  parametersCount: string | null
  releaseDate: string | null
  parentCompany: string | null
  provider: string
  model: string
  cashBalance: number
  portfolioValue: number
  netWorth: number
  createdAt: string
}

const companyIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  OpenAI: OpenAI,
  Meta: Meta.Color,
  Alibaba: Qwen.Color,
  Google: Gemini.Color,
  "Z.ai": ZAI,
}

function formatCash(value: number) {
  if (value == null || isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function AgentCell({ agent }: { agent: Agent }) {
  const Icon = agent.parentCompany ? companyIcons[agent.parentCompany] : null
  const pnl = agent.netWorth - 100_000
  const pnlPositive = pnl >= 0

  return (
    <div className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background/60">
            {Icon ? (
              <Icon size={20} />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {(agent.parentCompany ?? agent.provider).slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-pixel-square text-sm leading-none">
              {agent.agentName}
            </h3>
            <p className="mt-1 font-pixel-square text-xs text-muted-foreground">
              {agent.parentCompany ?? agent.provider}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-pixel-square text-xl tabular-nums tracking-tight md:text-2xl">
            {formatCash(agent.netWorth)}
          </p>
          <span
            className={`mt-0.5 block font-pixel-square text-[11px] tabular-nums md:text-xs ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}
          >
            {pnlPositive ? "+" : ""}
            {formatCash(pnl)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <code className="truncate font-pixel-square text-[11px] text-muted-foreground md:text-xs">
          {agent.model}
        </code>
        {agent.parametersCount && (
          <p className="font-pixel-square text-[11px] text-muted-foreground md:text-xs">
            {agent.parametersCount}
          </p>
        )}
      </div>
    </div>
  )
}

function ModelsGrid({ agents }: { agents: Agent[] }) {
  const cols = 3
  const rows = Math.max(2, Math.ceil(agents.length / cols))

  const { canvasRef } = useGridBeam({
    rows,
    cols,
    colorVariant: "colorful",
    theme: "dark",
    duration: 4,
    strength: 0.8,
    breathe: true,
  })

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <GridBeamDividers
        rows={rows}
        cols={cols}
        className="hidden md:block"
      />
      <GridBeamCanvas
        ref={canvasRef}
        borderRadius={12}
        className="hidden md:block"
      />
      <GridBeamContent>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {agents.map((agent) => (
            <AgentCell key={agent.id} agent={agent} />
          ))}
        </div>
      </GridBeamContent>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="rounded-xl border border-border">
      <div className="grid grid-cols-1 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-md" />
                <div>
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-14" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="mt-1.5 h-3 w-14" />
              </div>
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ModelsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.json()
      })
      .then((data) => setAgents(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const providers = [...new Set(agents.map((a) => a.provider))]

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Models</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-3 pt-0 sm:gap-6 sm:p-4 sm:pt-0">
        <div>
          <h1 className="font-pixel-square text-xl tracking-tight">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading agents..."
              : `${agents.length} agents across ${providers.length} providers`}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            Failed to load agents — make sure the server is running on :8787
          </div>
        )}

        {loading ? <GridSkeleton /> : <ModelsGrid agents={agents} />}
      </div>
    </>
  )
}
