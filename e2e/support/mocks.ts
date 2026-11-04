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

interface MockControls {
  setScenario: (name: Scenario) => void
  setLatency: (mode: Latency) => void
  expireSessions: () => void
  updateNft: (nftId: string, update: { editionId?: string; price?: string; available?: number }) => unknown
  getRealtimeStatus: () => { connections: Array<{ id: string; userId: string | null }> }
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
}

export async function openApp(page: Page, path = '/', { scenario = 'success', latency = 'none', mockPanel = 'hidden' }: OpenOptions = {}) {
  const url = new URL(path, 'http://app.local')
  url.searchParams.set('scenario', scenario)
  url.searchParams.set('latency', latency)
  url.searchParams.set('mockPanel', mockPanel)
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
