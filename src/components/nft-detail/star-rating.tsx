import { Star } from 'lucide-react'
import { formatRating } from '@/lib/nft-edition'
import { cn } from '@/lib/utils'

const STARS = [1, 2, 3, 4, 5]

type StarRatingProps = {
  value: number
  className?: string
}

export function StarRating({ value, className }: StarRatingProps) {
  const filled = Math.round(value)

  return (
    <span className={cn('inline-flex gap-1', className)}>
      <span className="sr-only">Nota {formatRating(value)} de 5</span>
      {STARS.map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn('size-3.5', star <= filled ? 'fill-current text-foreground' : 'text-border-soft')}
        />
      ))}
    </span>
  )
}
