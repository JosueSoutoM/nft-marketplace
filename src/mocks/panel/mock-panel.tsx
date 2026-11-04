import { useId, useState, useSyncExternalStore } from 'react'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { resetMocks } from '../control'
import { expireAllSessions } from '../db/sessions'
import {
  LATENCY_LABELS,
  LATENCY_MODES,
  SCENARIOS,
  SCENARIO_NAMES,
  getSettings,
  setLatency,
  setScenario,
  subscribeSettings,
  type LatencyMode,
  type ScenarioName,
} from '../scenarios'
import { RealtimeTools } from './realtime-tools'

export function MockPanel() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings)
  const [status, setStatus] = useState('')
  const [resetting, setResetting] = useState(false)
  const scenarioId = useId()
  const latencyId = useId()
  const descriptionId = useId()
  const scenario = SCENARIOS[settings.scenario]
  const latencyLocked = scenario.latency !== undefined

  function handleScenarioChange(value: string) {
    setScenario(value as ScenarioName)
    setStatus(`Cenário aplicado: ${SCENARIOS[value as ScenarioName].label}.`)
  }

  function handleLatencyChange(value: string) {
    setLatency(value as LatencyMode)
    setStatus(`Latência aplicada: ${LATENCY_LABELS[value as LatencyMode]}.`)
  }

  function handleExpireSessions() {
    expireAllSessions()
    setStatus('Todas as sessões abertas foram expiradas.')
  }

  async function handleReset() {
    setResetting(true)
    setStatus('Restaurando dados simulados…')
    await resetMocks()
    window.location.reload()
  }

  return (
    <div data-mock-panel className="fixed bottom-32 left-3 z-40 md:bottom-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="bg-background text-body-sm">
            <FlaskConical aria-hidden="true" className="size-4" />
            Mocks: {scenario.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="max-h-[85dvh] w-80 gap-4 overflow-y-auto">
          <PopoverHeader>
            <PopoverTitle>Simulação da API</PopoverTitle>
            <PopoverDescription>Cenários e latência aplicados pelo MSW a todas as requisições.</PopoverDescription>
          </PopoverHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={scenarioId}>Cenário</Label>
            <Select value={settings.scenario} onValueChange={handleScenarioChange}>
              <SelectTrigger id={scenarioId} aria-describedby={descriptionId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {SCENARIO_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {SCENARIOS[name].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id={descriptionId} className="text-caption text-text-secondary">
              {scenario.description}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={latencyId}>Latência</Label>
            <Select value={settings.latency} onValueChange={handleLatencyChange} disabled={latencyLocked}>
              <SelectTrigger id={latencyId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {LATENCY_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LATENCY_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {latencyLocked && <p className="text-caption text-text-secondary">Definida pelo cenário atual.</p>}
          </div>

          <RealtimeTools onStatus={setStatus} />

          <div className="flex flex-wrap gap-2 border-t border-border-soft pt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleExpireSessions}>
              Expirar sessões
            </Button>
            <Button type="button" size="sm" onClick={handleReset} disabled={resetting}>
              Restaurar dados
            </Button>
          </div>

          <output aria-live="polite" className="block text-caption text-text-secondary">
            {status}
          </output>
        </PopoverContent>
      </Popover>
    </div>
  )
}
