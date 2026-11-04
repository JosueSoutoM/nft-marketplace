import type { EthAmount, Nft, Order } from '@/api/contracts'
import { resetDatabase } from './db'
import { expireAllSessions } from './db/sessions'
import {
  LATENCY_MODES,
  SCENARIO_NAMES,
  getSettings,
  resetSettings,
  setLatency,
  setScenario,
  setSessionTtl,
  type LatencyMode,
  type MockSettings,
  type ScenarioName,
} from './scenarios'
import { updateNftEditions } from './services/catalog'
import { clearSettlementTimers, settleOrder } from './services/orders'

export interface NftUpdate {
  editionId?: string
  price?: EthAmount
  available?: number
}

export interface MockControls {
  scenarios: readonly ScenarioName[]
  latencies: readonly LatencyMode[]
  reset: () => Promise<void>
  setScenario: (name: ScenarioName) => void
  setLatency: (mode: LatencyMode) => void
  setSessionTtl: (seconds: number) => void
  expireSessions: () => void
  getSettings: () => MockSettings
  updateNft: (nftId: string, update: NftUpdate) => Nft
  advanceOrder: (orderId: string, status?: 'confirmed' | 'declined') => Order
}

declare global {
  interface Window {
    __mocks?: MockControls
  }
}

export async function resetMocks(): Promise<void> {
  clearSettlementTimers()
  resetSettings()
  await resetDatabase()
}

export function installMockControls(): void {
  window.__mocks = {
    scenarios: SCENARIO_NAMES,
    latencies: LATENCY_MODES,
    reset: resetMocks,
    setScenario,
    setLatency,
    setSessionTtl,
    expireSessions: expireAllSessions,
    getSettings,
    updateNft: (nftId, update) => structuredClone(updateNftEditions(nftId, [update])),
    advanceOrder: (orderId, status) => structuredClone(settleOrder(orderId, status)),
  }
}
