import { cn } from "@/lib/utils"

type PlainFont = "sans" | "mono"
type PixelFont = "square" | "grid" | "circle" | "triangle" | "line"

const PLAIN_FONT_MAP: Record<PlainFont, string> = {
  sans: "font-sans",
  mono: "font-mono",
}

const PIXEL_FONT_MAP: Record<PixelFont, string> = {
  square: "font-pixel-square",
  grid: "font-pixel-grid",
  circle: "font-pixel-circle",
  triangle: "font-pixel-triangle",
  line: "font-pixel-line",
}

type Segment = { type: "pixel"; text: string } | { type: "plain"; text: string }

function splitTextByPlainWords(text: string, plainWords: string[]): Segment[] {
  if (plainWords.length === 0) return [{ type: "pixel", text }]

  const sorted = [...plainWords].sort((a, b) => b.length - a.length)

  const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  const pattern = new RegExp(`(${escaped.join("|")})`, "g")

  const segments: Segment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index ?? 0
    if (matchStart > lastIndex) {
      segments.push({ type: "pixel", text: text.slice(lastIndex, matchStart) })
    }
    segments.push({ type: "plain", text: match[0] })
    lastIndex = matchStart + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: "pixel", text: text.slice(lastIndex) })
  }

  return segments
}

export interface PixelParagraphInverseProps extends React.ComponentProps<"p"> {
  text: string
  plainWords?: string[]
  as?: "p" | "span" | "div"
  pixelFont?: PixelFont
  plainFont?: PlainFont
  plainWordClassName?: string
}

export function PixelParagraphInverse({
  text,
  plainWords = [],
  as: Tag = "p",
  className,
  pixelFont = "square",
  plainFont = "sans",
  plainWordClassName,
  ...props
}: PixelParagraphInverseProps) {
  const segments = splitTextByPlainWords(text, plainWords)
  const pixelFontClass = PIXEL_FONT_MAP[pixelFont]
  const plainFontClass = PLAIN_FONT_MAP[plainFont]

  return (
    <Tag
      data-slot="pixel-paragraph-inverse"
      className={cn(pixelFontClass, className)}
      {...props}
    >
      {segments.map((segment, index) => {
        const key = `${segment.type}-${segment.text}-${index}`
        return segment.type === "plain" ? (
          <span
            key={key}
            data-slot="plain-word"
            className={cn(plainFontClass, plainWordClassName)}
          >
            {segment.text}
          </span>
        ) : (
          <span key={key}>{segment.text}</span>
        )
      })}
    </Tag>
  )
}
