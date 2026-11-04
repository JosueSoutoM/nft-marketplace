import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BackButton({ className }: { className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  function goBack() {
    if (canGoBack) {
      router.history.back()
      return
    }
    router.navigate({ to: '/' })
  }

  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={goBack}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary transition-colors hover:text-text-accent',
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
    </button>
  )
}
