import { cn } from '@/lib/utils'

const MAX_VISIBLE_COUNT = 99

export function CartCountBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) {
    return null
  }
  return (
    <span
      aria-hidden="true"
      data-slot="cart-count"
      className={cn(
        'absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold text-primary-foreground',
        className,
      )}
    >
      {count > MAX_VISIBLE_COUNT ? `${MAX_VISIBLE_COUNT}+` : count}
    </span>
  )
}
