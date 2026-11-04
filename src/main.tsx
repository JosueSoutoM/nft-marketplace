import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'

const MockPanel = mocksEnabled
  ? lazy(() => import('@/mocks/panel/mock-panel').then((module) => ({ default: module.MockPanel })))
  : null

async function enableMocks() {
  if (!mocksEnabled) {
    return
  }
  const { startMocks } = await import('@/mocks/setup')
  await startMocks()
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
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
