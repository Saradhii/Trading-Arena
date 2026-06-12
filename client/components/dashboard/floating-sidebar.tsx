"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

const PANEL_SURFACE =
  "rounded-2xl bg-background/70 ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-background/55 dark:ring-white/10 dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"

const NAV_LINK_BASE =
  "font-pixel-square block rounded-xl px-3 py-2 text-base tracking-wide transition-colors"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agents", href: "/dashboard/agents" },
  { label: "Providers", href: "/dashboard/providers" },
  { label: "Trades", href: "/dashboard/trades" },
  { label: "History", href: "/dashboard/history" },
] as const

function BrandLink() {
  return (
    <Link
      href="/"
      aria-label="Trading Arena home"
      className="group relative flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors hover:bg-foreground/5"
    >
      <span className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
        <svg aria-hidden viewBox="0 0 32 24" className="size-4" fill="none">
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
  )
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
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
  )
}

export function FloatingSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      {/* Mobile header */}
      <header
        className={cn(
          PANEL_SURFACE,
          "fixed inset-x-4 top-4 z-40 flex h-[66px] items-center justify-between p-3 lg:hidden",
        )}
      >
        <BrandLink />
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="rounded-xl bg-transparent hover:bg-foreground/5" />
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile slide-in sidebar */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Sidebar"
        className={cn(
          PANEL_SURFACE,
          "fixed bottom-4 left-4 top-4 z-50 flex w-64 max-w-[80vw] flex-col gap-3 p-3 transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]",
        )}
      >
        <div className="flex items-center justify-between">
          <BrandLink />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="h-px bg-foreground/10" />
        <NavLinks pathname={pathname} />
      </aside>

      {/* Desktop floating panels */}
      <div
        aria-label="Quick links"
        className={cn(
          PANEL_SURFACE,
          "fixed left-4 top-4 z-40 hidden h-[66px] w-52 items-center p-3 lg:flex",
        )}
      >
        <BrandLink />
      </div>

      <aside
        aria-label="Sidebar"
        className={cn(
          PANEL_SURFACE,
          "fixed bottom-4 left-4 top-[88px] z-40 hidden w-52 p-3 lg:block",
        )}
      >
        <NavLinks pathname={pathname} />
      </aside>
    </>
  )
}
