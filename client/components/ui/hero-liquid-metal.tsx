"use client"

import * as React from "react"
import { LiquidMetal } from "@paper-design/shaders-react"

import { cn } from "@/lib/utils"

const MemoizedLiquidMetal = React.memo(LiquidMetal)

type LiquidMetalProps = React.ComponentProps<typeof LiquidMetal>

export type HeroLiquidMetalShaderOverrides = Partial<
  Pick<
    LiquidMetalProps,
    | "width"
    | "height"
    | "image"
    | "colorBack"
    | "colorTint"
    | "shape"
    | "repetition"
    | "softness"
    | "shiftRed"
    | "shiftBlue"
    | "distortion"
    | "contour"
    | "angle"
    | "speed"
    | "frame"
    | "scale"
    | "rotation"
    | "offsetX"
    | "offsetY"
    | "fit"
    | "originX"
    | "originY"
    | "minPixelRatio"
    | "maxPixelCount"
  >
>

export interface HeroLiquidMetalRootProps
  extends Omit<React.ComponentPropsWithoutRef<"section">, "title">,
    HeroLiquidMetalShaderOverrides {
  srTitle?: string
  desktopShaderProps?: Partial<LiquidMetalProps>
}

export interface HeroLiquidMetalVisualProps
  extends React.ComponentPropsWithoutRef<"div"> {
  desktopShaderProps?: Partial<LiquidMetalProps>
  desktopClassName?: string
}

interface HeroLiquidMetalContextValue {
  srTitle: string
  mergedDesktopShaderProps: Partial<LiquidMetalProps>
}

const defaultDesktopShaderProps: Partial<LiquidMetalProps> = {
  width: 1280,
  height: 720,
  image: "/cult-icon.svg",
  colorBack: "#ffffff00",
  colorTint: "#2c5d72",
  shape: undefined,
  repetition: 6,
  softness: 0.8,
  shiftRed: 1,
  shiftBlue: -1,
  distortion: 0.4,
  contour: 0.4,
  angle: 0,
  speed: 1,
  scale: 0.6,
  fit: "contain",
}

const HeroLiquidMetalContext = React.createContext<
  HeroLiquidMetalContextValue | undefined
>(undefined)

function useHeroLiquidMetalContext() {
  const context = React.useContext(HeroLiquidMetalContext)
  if (!context) {
    throw new Error(
      "HeroLiquidMetal components must be used within HeroLiquidMetalRoot"
    )
  }
  return context
}

export const HeroLiquidMetalRoot = React.forwardRef<
  HTMLElement,
  HeroLiquidMetalRootProps
>(({ className, children, srTitle = "Trading Arena", desktopShaderProps, width, height, image, colorBack, colorTint, shape, repetition, softness, shiftRed, shiftBlue, distortion, contour, angle, speed, frame, scale, rotation, offsetX, offsetY, fit, originX, originY, minPixelRatio, maxPixelCount, ...props }, ref) => {
  const shaderOverrides = React.useMemo((): Partial<LiquidMetalProps> => {
    const overrides: Partial<LiquidMetalProps> = {}
    if (width !== undefined) overrides.width = width
    if (height !== undefined) overrides.height = height
    if (image !== undefined) overrides.image = image
    if (colorBack !== undefined) overrides.colorBack = colorBack
    if (colorTint !== undefined) overrides.colorTint = colorTint
    if (shape !== undefined) overrides.shape = shape
    if (repetition !== undefined) overrides.repetition = repetition
    if (softness !== undefined) overrides.softness = softness
    if (shiftRed !== undefined) overrides.shiftRed = shiftRed
    if (shiftBlue !== undefined) overrides.shiftBlue = shiftBlue
    if (distortion !== undefined) overrides.distortion = distortion
    if (contour !== undefined) overrides.contour = contour
    if (angle !== undefined) overrides.angle = angle
    if (speed !== undefined) overrides.speed = speed
    if (frame !== undefined) overrides.frame = frame
    if (scale !== undefined) overrides.scale = scale
    if (rotation !== undefined) overrides.rotation = rotation
    if (offsetX !== undefined) overrides.offsetX = offsetX
    if (offsetY !== undefined) overrides.offsetY = offsetY
    if (fit !== undefined) overrides.fit = fit
    if (originX !== undefined) overrides.originX = originX
    if (originY !== undefined) overrides.originY = originY
    if (minPixelRatio !== undefined) overrides.minPixelRatio = minPixelRatio
    if (maxPixelCount !== undefined) overrides.maxPixelCount = maxPixelCount
    return overrides
  }, [
    width,
    height,
    image,
    colorBack,
    colorTint,
    shape,
    repetition,
    softness,
    shiftRed,
    shiftBlue,
    distortion,
    contour,
    angle,
    speed,
    frame,
    scale,
    rotation,
    offsetX,
    offsetY,
    fit,
    originX,
    originY,
    minPixelRatio,
    maxPixelCount,
  ])

  const mergedDesktopShaderProps = React.useMemo(
    () => ({
      ...defaultDesktopShaderProps,
      ...shaderOverrides,
      ...desktopShaderProps,
    }),
    [shaderOverrides, desktopShaderProps]
  )

  const contextValue = React.useMemo<HeroLiquidMetalContextValue>(
    () => ({
      srTitle,
      mergedDesktopShaderProps,
    }),
    [srTitle, mergedDesktopShaderProps]
  )

  return (
    <HeroLiquidMetalContext.Provider value={contextValue}>
      <section
        className={cn("relative h-full w-full overflow-hidden", className)}
        data-slot="hero-liquid-metal-root"
        ref={ref}
        {...props}
      >
        <h1 className="sr-only">{srTitle}</h1>
        {children}
      </section>
    </HeroLiquidMetalContext.Provider>
  )
})
HeroLiquidMetalRoot.displayName = "HeroLiquidMetalRoot"

export function HeroLiquidMetalContainer({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "container relative z-10 grid gap-6 pb-16 sm:gap-8 sm:pb-20 lg:grid-cols-[1fr_minmax(300px,500px)] lg:items-center lg:gap-12 lg:pb-24 xl:grid-cols-[1fr_1fr]",
        className
      )}
      data-slot="hero-liquid-metal-container"
      {...props}
    />
  )
}

export function HeroLiquidMetalContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-4 text-balance sm:gap-5 sm:px-4 md:px-8 lg:gap-6 lg:pr-0 lg:pl-4 xl:pl-8 2xl:pl-0",
        className
      )}
      data-slot="hero-liquid-metal-content"
      {...props}
    />
  )
}

export function HeroLiquidMetalVisual({
  className,
  desktopClassName,
  desktopShaderProps,
  ...props
}: HeroLiquidMetalVisualProps) {
  const context = useHeroLiquidMetalContext()
  const resolvedDesktopShaderProps = {
    ...context.mergedDesktopShaderProps,
    ...desktopShaderProps,
  }

  return (
    <div
      className={cn(
        "relative hidden h-[350px] lg:block lg:h-[400px] xl:h-[500px]",
        className
      )}
      data-slot="hero-liquid-metal-visual"
      {...props}
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden rounded-full",
          desktopClassName
        )}
        data-slot="hero-liquid-metal-desktop"
      >
        <MemoizedLiquidMetal
          {...resolvedDesktopShaderProps}
          image={
            resolvedDesktopShaderProps.image ??
            (defaultDesktopShaderProps.image as string)
          }
        />
      </div>
    </div>
  )
}
