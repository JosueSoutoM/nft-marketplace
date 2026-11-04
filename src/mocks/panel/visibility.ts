const PANEL_STORAGE_KEY = 'kurio.mocks.panel'
const PANEL_URL_PARAM = 'mockPanel'

type PanelVisibility = 'visible' | 'hidden'

function isPanelVisibility(value: string | null): value is PanelVisibility {
  return value === 'visible' || value === 'hidden'
}

export function applyPanelVisibilityOverride(): void {
  const url = new URL(window.location.href)
  const value = url.searchParams.get(PANEL_URL_PARAM)
  if (value === null) {
    return
  }
  if (isPanelVisibility(value)) {
    try {
      localStorage.setItem(PANEL_STORAGE_KEY, value)
    } catch {
      return
    }
  } else {
    console.warn(`[mocks] Valor desconhecido para ${PANEL_URL_PARAM}: ${value}`)
  }
  url.searchParams.delete(PANEL_URL_PARAM)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function isPanelHidden(): boolean {
  try {
    return localStorage.getItem(PANEL_STORAGE_KEY) === 'hidden'
  } catch {
    return false
  }
}
