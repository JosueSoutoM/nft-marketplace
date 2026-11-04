import type { ComponentProps } from 'react'
import { notifyComingSoon } from './notify-coming-soon'

const COMING_SOON_SUFFIX = ' (em breve)'

type ComingSoonButtonProps = Omit<ComponentProps<'button'>, 'onClick' | 'type'> & {
  feature: string
}

export function ComingSoonButton({
  feature,
  children,
  'aria-label': ariaLabel,
  ...props
}: ComingSoonButtonProps) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={ariaLabel ? `${ariaLabel}${COMING_SOON_SUFFIX}` : undefined}
      onClick={() => notifyComingSoon(feature)}
      {...props}
    >
      {children}
      {!ariaLabel && <span className="sr-only">{COMING_SOON_SUFFIX}</span>}
    </button>
  )
}
