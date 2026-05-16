import { FloatingSidebar } from "@/components/dashboard/floating-sidebar"

const PANEL_CLASS =
  "rounded-2xl bg-background/70 ring-1 ring-black/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-background/55 dark:ring-white/10 dark:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <FloatingSidebar />
      <div
        className={`${PANEL_CLASS} fixed left-[232px] right-4 top-4 z-30 h-[66px]`}
      />
      <main
        className={`${PANEL_CLASS} fixed left-[232px] right-4 top-[88px] bottom-4 z-30 overflow-auto p-3`}
      >
        {children}
      </main>
    </div>
  )
}
