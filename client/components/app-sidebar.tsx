"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavBrand } from "@/components/nav-brand"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon } from "lucide-react"

const brand = {
  name: "Trading",
  tagline: "Arena",
  logo: (
    <span className="font-pixel-square text-base font-bold leading-none">
      T
    </span>
  ),
}

const navItems = [
  {
    title: "Playground",
    url: "/dashboard",
    icon: <TerminalSquareIcon />,
    prefix: "/dashboard",
    exactPrefix: true,
    items: [
      { title: "Dashboard", url: "/dashboard" },
      { title: "History", url: "/dashboard/history" },
      { title: "Starred", url: "#" },
      { title: "Settings", url: "#" },
    ],
  },
  {
    title: "Models",
    url: "/dashboard/models",
    icon: <BotIcon />,
    prefix: "/dashboard/models",
    items: [
      { title: "All Models", url: "/dashboard/models" },
    ],
  },
  {
    title: "Documentation",
    url: "#",
    icon: <BookOpenIcon />,
    prefix: "/dashboard/docs",
    items: [
      { title: "Introduction", url: "#" },
      { title: "Get Started", url: "#" },
      { title: "Tutorials", url: "#" },
      { title: "Changelog", url: "#" },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: <Settings2Icon />,
    prefix: "/dashboard/settings",
    items: [
      { title: "General", url: "#" },
      { title: "Team", url: "#" },
      { title: "Billing", url: "#" },
      { title: "Limits", url: "#" },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const items = navItems.map((item) => ({
    ...item,
    isActive: item.exactPrefix
      ? pathname === item.prefix || item.items?.some((sub) => sub.url !== "#" && pathname.startsWith(sub.url))
      : pathname.startsWith(item.prefix),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavBrand
          name={brand.name}
          tagline={brand.tagline}
          logo={brand.logo}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
