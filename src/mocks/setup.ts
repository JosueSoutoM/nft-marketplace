import { installMockControls } from './control'
import { initDatabase } from './db'
import { applyPanelVisibilityOverride } from './panel/visibility'
import { applyUrlOverrides } from './scenarios'
import { resumePendingOrders } from './services/orders'

export async function startMocks(): Promise<void> {
  const browser = import('./browser')
  await initDatabase()
  applyUrlOverrides()
  applyPanelVisibilityOverride()
  const { worker } = await browser
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  resumePendingOrders()
  installMockControls()
}
