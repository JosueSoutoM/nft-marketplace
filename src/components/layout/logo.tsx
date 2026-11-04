import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio, página inicial"
      className={cn('font-bold tracking-[0.08em] text-foreground', className)}
    >
      KURIO
    </Link>
  )
}
