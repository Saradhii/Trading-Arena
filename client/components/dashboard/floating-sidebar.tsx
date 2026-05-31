"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const PANEL_CLASS =
  "fixed left-4 z-40 w-52 rounded-2xl bg-background/70 p-3 ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-background/55 dark:ring-white/10 dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"

const NAV_LINK_BASE =
  "font-pixel-square block rounded-xl px-3 py-2 text-base tracking-wide transition-colors"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agents", href: "/dashboard/agents" },
  { label: "Providers", href: "/dashboard/providers" },
  { label: "Trades", href: "/dashboard/trades" },
  { label: "History", href: "/dashboard/history" },
] as const

export function FloatingSidebar() {
  const pathname = usePathname()

  return (
    <>
      <div aria-label="Quick links" className={cn(PANEL_CLASS, "top-4")}>
        <Link
          href="/"
          aria-label="Trading Arena home"
          className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5"
        >
          <span className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
            <svg aria-hidden viewBox="0 0 32 24" className="size-5" fill="none">
              <polyline
                points="2,19 9,13 14,16 22,6 30,10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="22" cy="6" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="font-mono text-[15px] font-semibold tracking-tight text-foreground">
              trading
            </span>
            <span className="font-mono text-[15px] font-semibold tracking-tight text-foreground/45">
              /arena
            </span>
          </span>
        </Link>
      </div>

      <aside
        aria-label="Sidebar"
        className={cn(PANEL_CLASS, "top-[88px] bottom-4")}
      >
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  NAV_LINK_BASE,
                  isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
