import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { RealtimeBridge } from '@/realtime/realtime-bridge'
import { router } from '@/router'
import './index.css'

const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'

const MockPanel = mocksEnabled
  ? lazy(() => import('@/mocks/panel/mock-panel').then((module) => ({ default: module.MockPanel })))
  : null

const FONT_WAIT_MS = 1500

function waitForFont() {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS))
  const font = document.fonts.load('1rem "Roboto Mono Variable"').then(() => undefined)
  return Promise.race([font, timeout]).catch(() => undefined)
}

async function enableMocks() {
  if (!mocksEnabled) {
    return
  }
  const { startMocks } = await import('@/mocks/setup')
  await startMocks()
}

Promise.all([enableMocks(), waitForFont()]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RealtimeBridge />
        <RouterProvider router={router} />
      </QueryClientProvider>
      {MockPanel && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </StrictMode>,
  )
})
