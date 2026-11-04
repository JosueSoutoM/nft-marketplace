import type { ReactNode } from 'react'
import { BackButton } from './back-button'

type PageHeadingProps = {
  children: ReactNode
  withBackButton?: boolean
}

export function PageHeading({ children, withBackButton = false }: PageHeadingProps) {
  return (
    <div className="flex items-center gap-4">
      {withBackButton && <BackButton className="md:hidden" />}
      <h1 className="text-display-sm text-foreground md:text-heading">{children}</h1>
    </div>
  )
}
