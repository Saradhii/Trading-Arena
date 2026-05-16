"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const PANEL_CLASS =
  "fixed left-4 z-40 w-52 rounded-2xl border border-black/70 bg-background/60 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/80 dark:bg-background/40 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"

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
            "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
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
