import { installMockControls } from './control'
import { initDatabase } from './db'
import { applyUrlOverrides } from './scenarios'
import { resumePendingOrders } from './services/orders'

export async function startMocks(): Promise<void> {
  await initDatabase()
  applyUrlOverrides()
  const { worker } = await import('./browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD })
  resumePendingOrders()
  installMockControls()
}
