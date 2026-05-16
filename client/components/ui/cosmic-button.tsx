"use client"

import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

export type CosmicButtonProps<E extends "a" | "button" = "a"> = {
  as?: E
} & ComponentPropsWithoutRef<E>

export function CosmicButton<E extends "a" | "button" = "a">({
  as,
  className,
  children,
  ...props
}: CosmicButtonProps<E>) {
  const Element = as ?? "a"
  const isAnchor = Element === "a"

  const baseClassName = cn(
    "group/cosmic relative inline-flex min-h-11 min-w-11 items-center justify-center gap-3 rounded-[15px] p-[3px] transition-transform  ",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900",
    className
  )

  const content = (
    <>
      <span className="absolute inset-[-3px] overflow-hidden rounded-[15px]">
        <span className="absolute inset-[-200%] animate-cosmic-spin bg-[conic-gradient(from_0deg,#d4d4d4,#f5f5f5,#fafafa,#a3a3a3,#737373,#a3a3a3,#d4d4d4)] opacity-95 dark:bg-[conic-gradient(from_0deg,#525252,#737373,#a3a3a3,#404040,#262626,#404040,#525252)]" />
      </span>

      <span className="absolute inset-[-3px] overflow-hidden rounded-[15px] opacity-45 mix-blend-soft-light dark:opacity-60 dark:mix-blend-overlay">
        <span className="absolute inset-[-200%] animate-cosmic-spin-slow bg-[conic-gradient(from_180deg,#fafafa_0%,transparent_30%,#d4d4d4_50%,transparent_70%,#737373_100%)] dark:bg-[conic-gradient(from_180deg,#a3a3a3_0%,transparent_30%,#525252_50%,transparent_70%,#262626_100%)]" />
      </span>

      <span className="relative z-10 flex items-center gap-3 rounded-[12px] bg-muted px-5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(15,23,42,0.08),0_1px_1px_rgba(15,23,42,0.08),0_8px_24px_rgba(15,23,42,0.14)] transition-all duration-300 group-hover/cosmic:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.14),0_12px_34px_rgba(15,23,42,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.5),0_1px_1px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.35)] dark:group-hover/cosmic:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.55),0_14px_34px_rgba(0,0,0,0.42)] active:scale-[0.98]">
        <span className="font-pixel-square text-base tracking-wide text-foreground">
          {children ?? "Placeholder text"}
        </span>
      </span>
    </>
  )

  if (isAnchor) {
    const { href, rel, target, ...rest } =
      props as ComponentPropsWithoutRef<"a">
    return (
      <a
        className={baseClassName}
        href={href ?? "https://aisdkagents.com"}
        rel={rel ?? "noopener noreferrer"}
        target={target ?? "_blank"}
        {...rest}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      className={baseClassName}
      {...(props as ComponentPropsWithoutRef<"button">)}
    >
      {content}
    </button>
  )
}
