import { MAIN_CONTENT_ID } from '@/components/layout/skip-link'

export function focusMainContentIfLost() {
  requestAnimationFrame(() => {
    if (!document.activeElement || document.activeElement === document.body) {
      document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true })
    }
  })
}
