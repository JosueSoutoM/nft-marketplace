import type { Page } from '@playwright/test'

export type Scenario =
  | 'success'
  | 'empty-catalog'
  | 'variable-latency'
  | 'network-error'
  | 'server-error'
  | 'service-unavailable'
  | 'transient-failure'
  | 'session-expired'
  | 'register-conflict'
  | 'form-validation'
  | 'favorite-failure'
  | 'wallet-rejected'
  | 'price-changed'
  | 'edition-sold-out'
  | 'order-timeout'
  | 'payment-declined'

export type Latency = 'none' | 'fixed' | 'slow' | 'variable'

export type Settlement = 'auto' | 'manual'

interface MockControls {
  reset: () => Promise<void>
  setScenario: (name: Scenario) => void
  setLatency: (mode: Latency) => void
  expireSessions: () => void
  updateNft: (nftId: string, update: { editionId?: string; price?: string; available?: number }) => unknown
  getRealtimeStatus: () => { connections: Array<{ id: string; userId: string | null }> }
  setSettlement: (mode: Settlement) => void
  advanceOrder: (orderId: string, status?: 'confirmed' | 'declined') => unknown
  dropRealtime: () => number
  refuseRealtime: (seconds: number) => void
  replayLastEvent: () => { type: string; version: number } | null
  sendStaleEvent: () => { type: string; version: number } | null
}

declare global {
  interface Window {
    __mocks?: MockControls
  }
}

interface OpenOptions {
  scenario?: Scenario
  latency?: Latency
  mockPanel?: 'visible' | 'hidden'
  settlement?: Settlement
}

export async function openApp(page: Page, path = '/', { scenario = 'success', latency = 'none', mockPanel = 'hidden', settlement = 'auto' }: OpenOptions = {}) {
  const url = new URL(path, 'http://app.local')
  url.searchParams.set('scenario', scenario)
  url.searchParams.set('latency', latency)
  url.searchParams.set('mockPanel', mockPanel)
  url.searchParams.set('settlement', settlement)
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
  await page.waitForFunction(() => '__mocks' in window)
}

export async function setScenario(page: Page, scenario: Scenario) {
  await page.evaluate((name) => window.__mocks?.setScenario(name), scenario)
}

export async function setLatency(page: Page, latency: Latency) {
  await page.evaluate((mode) => window.__mocks?.setLatency(mode), latency)
}

export function searchParam(page: Page, name: string): string | null {
  return new URL(page.url()).searchParams.get(name)
}
