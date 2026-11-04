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

export interface MockControls {
  scenarios: readonly ScenarioName[]
  latencies: readonly LatencyMode[]
  reset: () => Promise<void>
  setScenario: (name: ScenarioName) => void
  setLatency: (mode: LatencyMode) => void
  setSessionTtl: (seconds: number) => void
  expireSessions: () => void
  getSettings: () => MockSettings
}

declare global {
  interface Window {
    __mocks?: MockControls
  }
}

export async function resetMocks(): Promise<void> {
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
  }
}
