import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  value,
  thumbLabels = [],
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels?: string[]
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      className={cn(
        "relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-primary/40"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {(value ?? []).map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabels[index]}
          className="block size-3.5 rounded-full border-2 border-ink bg-primary ring-1 ring-primary transition-shadow hover:ring-2 focus-visible:ring-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
