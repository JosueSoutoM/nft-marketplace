import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useMatches } from '@tanstack/react-router'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { NotFound } from '@/components/layout/not-found'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/skip-link'
import { Toaster } from '@/components/ui/sonner'
import { LiveAnnouncer } from '@/components/live-announcer'
import { cn } from '@/lib/utils'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const hideMobileTabBar = useMatches({
    select: (matches) => matches.some((match) => match.staticData.hideMobileTabBar),
  })
  const mobileActionBar = useMatches({
    select: (matches) => matches.some((match) => match.staticData.mobileActionBar),
  })
  const reserveMobileBar = !hideMobileTabBar || mobileActionBar

  return (
    <div className={cn('flex min-h-dvh flex-col', reserveMobileBar && 'pb-28 md:pb-0')}>
      <SkipLink />
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      {!hideMobileTabBar && <MobileTabBar />}
      <LiveAnnouncer />
      <Toaster position="bottom-right" mobileOffset={{ bottom: reserveMobileBar ? 120 : 16 }} />
    </div>
  )
}
