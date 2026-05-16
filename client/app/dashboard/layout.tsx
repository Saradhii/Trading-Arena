import { FloatingSidebar } from "@/components/dashboard/floating-sidebar"

const PANEL_CLASS =
  "rounded-2xl border border-black/70 bg-background/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/80 dark:bg-background/40 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"

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
