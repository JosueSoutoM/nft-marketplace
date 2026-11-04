import type { ApiErrorCode } from '@/api/contracts'
import { expireAllSessions } from './db/sessions'
import { ENDPOINTS, type EndpointId } from './endpoints'
import { errorResponse, networkErrorResponse } from './responses'

export const SCENARIO_NAMES = [
  'success',
  'empty-catalog',
  'variable-latency',
  'network-error',
  'server-error',
  'service-unavailable',
  'transient-failure',
  'session-expired',
  'unauthorized',
  'forbidden',
  'register-conflict',
  'form-validation',
  'coupon-invalid',
  'coupon-expired',
  'price-changed',
  'edition-sold-out',
  'order-timeout',
  'payment-confirmed',
  'payment-declined',
  'favorite-failure',
  'wallet-rejected',
] as const
export type ScenarioName = (typeof SCENARIO_NAMES)[number]

export const LATENCY_MODES = ['none', 'fixed', 'slow', 'variable'] as const
export type LatencyMode = (typeof LATENCY_MODES)[number]

type FailureResponse = { kind: 'network' } | { kind: 'http'; status: number; code: ApiErrorCode; message: string }

interface FailureRule {
  endpoints: 'all' | 'authenticated' | readonly EndpointId[]
  response: FailureResponse
  times?: number
}

export interface ScenarioDefinition {
  label: string
  description: string
  latency?: LatencyMode
  failure?: FailureRule
}

export interface MockSettings {
  scenario: ScenarioName
  latency: LatencyMode
  sessionTtlSeconds: number
}

export const FIXED_LATENCY_MS = 300
export const SLOW_LATENCY_MS = 2500
export const VARIABLE_LATENCY_MIN_MS = 150
export const VARIABLE_LATENCY_MAX_MS = 2000
export const ORDER_TIMEOUT_DELAY_MS = 20_000
export const DEFAULT_SESSION_TTL_SECONDS = 2 * 60 * 60

const SETTINGS_STORAGE_KEY = 'kurio.mocks.settings.v1'
const VARIABLE_LATENCY_SEED = 2026

const DEFAULT_SETTINGS: MockSettings = {
  scenario: 'success',
  latency: 'fixed',
  sessionTtlSeconds: DEFAULT_SESSION_TTL_SECONDS,
}

const SERVICE_UNAVAILABLE: FailureResponse = {
  kind: 'http',
  status: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
}

export const SCENARIOS: Record<ScenarioName, ScenarioDefinition> = {
  success: {
    label: 'Sucesso',
    description: 'Todas as operações respondem normalmente.',
  },
  'empty-catalog': {
    label: 'Catálogo vazio',
    description: 'A listagem de NFTs retorna zero resultados e qualquer detalhe responde 404.',
  },
  'variable-latency': {
    label: 'Latência variável',
    description: 'Cada resposta leva entre 150 ms e 2 s (sequência determinística), gerando respostas fora de ordem.',
    latency: 'variable',
  },
  'network-error': {
    label: 'Falha de conexão',
    description: 'Todas as requisições falham na rede, sem resposta HTTP.',
    failure: { endpoints: 'all', response: { kind: 'network' } },
  },
  'server-error': {
    label: 'Erro 500',
    description: 'Todas as requisições respondem 500 INTERNAL_ERROR.',
    failure: {
      endpoints: 'all',
      response: { kind: 'http', status: 500, code: 'INTERNAL_ERROR', message: 'Erro interno no servidor.' },
    },
  },
  'service-unavailable': {
    label: 'Serviço indisponível (503)',
    description: 'Todas as requisições respondem 503 SERVICE_UNAVAILABLE até o cenário ser trocado.',
    failure: { endpoints: 'all', response: SERVICE_UNAVAILABLE },
  },
  'transient-failure': {
    label: 'Falha transitória',
    description: 'As duas primeiras chamadas de cada endpoint respondem 503; as seguintes funcionam.',
    failure: { endpoints: 'all', response: SERVICE_UNAVAILABLE, times: 2 },
  },
  'session-expired': {
    label: 'Sessão expirada',
    description: 'Ao ativar, todas as sessões abertas expiram e as rotas privadas respondem 401 SESSION_EXPIRED. Novos logins funcionam.',
  },
  unauthorized: {
    label: 'Não autenticado (401)',
    description: 'Endpoints privados respondem 401 UNAUTHENTICATED, mesmo com token válido.',
    failure: {
      endpoints: 'authenticated',
      response: { kind: 'http', status: 401, code: 'UNAUTHENTICATED', message: 'Sessão inválida. Entre novamente.' },
    },
  },
  forbidden: {
    label: 'Acesso negado (403)',
    description: 'Endpoints privados respondem 403 FORBIDDEN.',
    failure: {
      endpoints: 'authenticated',
      response: { kind: 'http', status: 403, code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este recurso.' },
    },
  },
  'register-conflict': {
    label: 'Conflito de cadastro',
    description: 'O cadastro responde 409 EMAIL_TAKEN para qualquer e-mail.',
  },
  'form-validation': {
    label: 'Validação do servidor',
    description: 'Formulários válidos no cliente recebem 422 com fieldErrors do servidor (cadastro, perfil, senha e carteiras).',
  },
  'coupon-invalid': {
    label: 'Cupom inválido',
    description: 'Qualquer cupom aplicado responde 422 COUPON_INVALID.',
  },
  'coupon-expired': {
    label: 'Cupom expirado',
    description: 'Qualquer cupom aplicado responde 422 COUPON_EXPIRED.',
  },
  'price-changed': {
    label: 'Preço alterado na compra',
    description: 'Ao confirmar o pedido, o preço do primeiro item sobe, um nft.updated é emitido e o pedido responde 409 QUOTE_OUTDATED.',
  },
  'edition-sold-out': {
    label: 'Edição esgotada na compra',
    description: 'Ao confirmar o pedido, a edição do primeiro item esgota, um nft.updated é emitido e o pedido responde 409 AVAILABILITY_CONFLICT.',
  },
  'order-timeout': {
    label: 'Timeout após criar pedido',
    description: 'O pedido é criado, mas a primeira resposta só chega após o timeout do cliente. O reenvio com a mesma chave recupera o mesmo pedido.',
  },
  'payment-confirmed': {
    label: 'Pagamento confirmado',
    description: 'O pedido fica pendente por alguns segundos e é confirmado via order.updated.',
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'O pedido fica pendente e é recusado via order.updated. Os itens permanecem no carrinho.',
  },
  'favorite-failure': {
    label: 'Falha ao favoritar',
    description: 'Incluir ou remover favoritos responde 503, para exercitar o rollback otimista.',
    failure: { endpoints: ['favorites.add', 'favorites.remove'], response: SERVICE_UNAVAILABLE },
  },
  'wallet-rejected': {
    label: 'Carteira recusa conexão',
    description: 'A conexão da carteira no pagamento responde 409 WALLET_CONNECTION_REJECTED.',
    failure: {
      endpoints: ['wallets.connect'],
      response: {
        kind: 'http',
        status: 409,
        code: 'WALLET_CONNECTION_REJECTED',
        message: 'A carteira recusou a conexão.',
      },
    },
  },
}

export const LATENCY_LABELS: Record<LatencyMode, string> = {
  none: 'Nenhuma',
  fixed: `Fixa (${FIXED_LATENCY_MS} ms)`,
  slow: `Lenta (${SLOW_LATENCY_MS / 1000} s)`,
  variable: 'Variável (fora de ordem)',
}

let settings: MockSettings = loadSettings()
let requestCounter = 0
const failureCounts = new Map<EndpointId, number>()
const listeners = new Set<() => void>()

function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (SCENARIO_NAMES as readonly string[]).includes(value)
}

function isLatencyMode(value: unknown): value is LatencyMode {
  return typeof value === 'string' && (LATENCY_MODES as readonly string[]).includes(value)
}

function loadSettings(): MockSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null') as Partial<MockSettings> | null
    return {
      scenario: isScenarioName(parsed?.scenario) ? parsed.scenario : DEFAULT_SETTINGS.scenario,
      latency: isLatencyMode(parsed?.latency) ? parsed.latency : DEFAULT_SETTINGS.latency,
      sessionTtlSeconds:
        typeof parsed?.sessionTtlSeconds === 'number' && parsed.sessionTtlSeconds > 0
          ? parsed.sessionTtlSeconds
          : DEFAULT_SETTINGS.sessionTtlSeconds,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function updateSettings(patch: Partial<MockSettings>): void {
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.warn('[mocks] Falha ao persistir as configurações de cenário.', error)
  }
  listeners.forEach((listener) => listener())
}

function resetRuntime(): void {
  requestCounter = 0
  failureCounts.clear()
}

export function getSettings(): MockSettings {
  return settings
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function activeScenario(): ScenarioName {
  return settings.scenario
}

export function isScenario(name: ScenarioName): boolean {
  return settings.scenario === name
}

export function setScenario(name: ScenarioName): void {
  if (!isScenarioName(name)) {
    throw new Error(`Unknown scenario: ${String(name)}`)
  }
  updateSettings({ scenario: name })
  resetRuntime()
  if (name === 'session-expired') {
    expireAllSessions()
  }
}

export function setLatency(mode: LatencyMode): void {
  if (!isLatencyMode(mode)) {
    throw new Error(`Unknown latency mode: ${String(mode)}`)
  }
  updateSettings({ latency: mode })
  resetRuntime()
}

export function setSessionTtl(seconds: number): void {
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error(`Invalid session TTL: ${seconds}`)
  }
  updateSettings({ sessionTtlSeconds: seconds })
}

export function resetSettings(): void {
  updateSettings({ ...DEFAULT_SETTINGS })
  resetRuntime()
}

export function effectiveLatency(): LatencyMode {
  return SCENARIOS[settings.scenario].latency ?? settings.latency
}

function seededRandom(index: number): number {
  let value = (VARIABLE_LATENCY_SEED + Math.imul(index, 0x6d2b79f5)) >>> 0
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

export function nextLatencyMs(): number {
  requestCounter += 1
  switch (effectiveLatency()) {
    case 'none':
      return 0
    case 'fixed':
      return FIXED_LATENCY_MS
    case 'slow':
      return SLOW_LATENCY_MS
    case 'variable':
      return (
        VARIABLE_LATENCY_MIN_MS +
        Math.floor(seededRandom(requestCounter) * (VARIABLE_LATENCY_MAX_MS - VARIABLE_LATENCY_MIN_MS))
      )
  }
}

function ruleMatches(rule: FailureRule, endpoint: EndpointId): boolean {
  if (rule.endpoints === 'all') {
    return true
  }
  if (rule.endpoints === 'authenticated') {
    return ENDPOINTS[endpoint].auth
  }
  return rule.endpoints.includes(endpoint)
}

export function scenarioFailure(endpoint: EndpointId): Response | null {
  const rule = SCENARIOS[settings.scenario].failure
  if (!rule || !ruleMatches(rule, endpoint)) {
    return null
  }
  if (rule.times !== undefined) {
    const count = failureCounts.get(endpoint) ?? 0
    if (count >= rule.times) {
      return null
    }
    failureCounts.set(endpoint, count + 1)
  }
  return rule.response.kind === 'network'
    ? networkErrorResponse()
    : errorResponse(rule.response.status, rule.response.code, rule.response.message)
}

export function applyUrlOverrides(): void {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const latency = url.searchParams.get('latency')
  if (scenario === null && latency === null) {
    return
  }
  if (isScenarioName(scenario)) {
    setScenario(scenario)
  } else if (scenario !== null) {
    console.warn(`[mocks] Cenário desconhecido: ${scenario}`)
  }
  if (isLatencyMode(latency)) {
    setLatency(latency)
  } else if (latency !== null) {
    console.warn(`[mocks] Latência desconhecida: ${latency}`)
  }
  url.searchParams.delete('scenario')
  url.searchParams.delete('latency')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
