import type { NftSummary } from '@/api/contracts'

export const HERO_SLIDE_COUNT = 3

export function splitFeatured(items: NftSummary[]) {
  const spotlight = items[1] ?? items[0] ?? null
  const slides = items.filter((item) => item !== spotlight).slice(0, HERO_SLIDE_COUNT)
  return { spotlight, slides: slides.length > 0 ? slides : items.slice(0, HERO_SLIDE_COUNT) }
}
