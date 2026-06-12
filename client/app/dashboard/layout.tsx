import { FloatingSidebar } from "@/components/dashboard/floating-sidebar"
import { AssetTicker } from "@/components/dashboard/asset-ticker"
import { ThemeToggle } from "@/components/theme-toggle"

const PANEL_CLASS =
  "rounded-2xl bg-background/70 ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-background/55 dark:ring-white/10 dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background pt-[88px] text-foreground lg:pt-0">
      <FloatingSidebar />
      <ThemeToggle className="fixed right-7 top-[31px] z-40 hidden lg:inline-flex" />
      <div
        className={`${PANEL_CLASS} mx-4 flex h-12 items-center px-4 lg:fixed lg:left-[232px] lg:right-4 lg:top-4 lg:z-30 lg:mx-0 lg:h-[66px] lg:pl-6 lg:pr-14`}
      >
        <AssetTicker />
      </div>
      <main
        className={`${PANEL_CLASS} mx-4 mb-4 mt-3 p-3 lg:fixed lg:bottom-4 lg:left-[232px] lg:right-4 lg:top-[88px] lg:z-30 lg:m-0 lg:overflow-auto`}
      >
        {children}
      </main>
    </div>
  )
}
