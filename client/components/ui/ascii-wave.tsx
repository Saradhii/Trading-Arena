"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function AsciiWave({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const chars = "█▓▒░ "
    const width = 120
    const height = 40

    canvas.width = width * 8
    canvas.height = height * 12

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = "12px JetBrains Mono, monospace"

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const wave1 = Math.sin(x * 0.08 + time) * Math.cos(y * 0.12 + time * 0.5)
          const wave2 = Math.sin(x * 0.05 - time * 0.7) * Math.sin(y * 0.08 + time * 0.3)
          const wave3 = Math.cos(x * 0.03 + y * 0.03 + time * 0.4)

          const combined = (wave1 + wave2 + wave3) / 3
          const normalized = (combined + 1) / 2

          const charIndex = Math.floor(normalized * (chars.length - 1))
          const char = chars[charIndex]

          if (char !== " ") {
            const hue = 170 + normalized * 30
            const lightness = 0.5 + normalized * 0.3
            ctx.fillStyle = `oklch(${lightness} 0.15 ${hue} / ${0.3 + normalized * 0.7})`
            ctx.fillText(char, x * 8, y * 12 + 12)
          }
        }
      }

      time += 0.008
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-full w-full", className)}
      style={{ imageRendering: "pixelated" }}
    />
  )
}
