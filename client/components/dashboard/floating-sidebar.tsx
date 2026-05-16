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
          className={cn(
            NAV_LINK_BASE,
            "text-center text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
          )}
        >
          Home
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
