"use client"

import * as React from "react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavBrand({
  name,
  tagline,
  logo,
  href = "/",
}: {
  name: string
  tagline?: string
  logo: React.ReactNode
  href?: string
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" render={<a href={href} />}>
          <div className="flex aspect-square size-8 items-center justify-center rounded-sm border border-sidebar-foreground text-sidebar-foreground">
            {logo}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium font-pixel-square">{name}</span>
            {tagline ? (
              <span className="truncate text-xs font-pixel-square">{tagline}</span>
            ) : null}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
