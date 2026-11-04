import { Container } from '@/components/layout/container'
import { NftCardSkeleton } from '@/components/catalog/nft-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  breadcrumbClass,
  carouselItemClass,
  carouselTrackClass,
  collectionSectionClass,
  galleryClass,
  infoClass,
  infoLineClass,
  mainPanelClass,
  mainImageClass,
  mobileBarClass,
  pageClass,
  tabsSectionClass,
  thumbButtonClass,
  thumbListClass,
  titleClass,
  topGridClass,
} from './layout'

const THUMBS = 4
const INFO_LINES = 5
const STORY_LINES = 6
const CAROUSEL_ITEMS = 5

function Line({ className, width }: { className: string; width: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <Skeleton className={cn('h-[0.6em] min-h-3', width)} />
    </div>
  )
}

export function NftDetailSkeleton() {
  return (
    <>
      <Container className={pageClass} aria-busy="true">
        <output className="sr-only">Carregando NFT…</output>
        <div aria-hidden="true">
          <Skeleton className="size-10 rounded-full md:hidden" />
          <div className={breadcrumbClass}>
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className={topGridClass}>
            <div className={galleryClass}>
              <div className={thumbListClass}>
                {Array.from({ length: THUMBS }, (_, index) => (
                  <Skeleton key={index} className={cn(thumbButtonClass, 'rounded-md')} />
                ))}
              </div>
              <div className={mainPanelClass}>
                <Skeleton className={cn(mainImageClass, 'rounded-b-none md:rounded-b-2xl')} />
              </div>
            </div>
            <div className={infoClass}>
              <Line className={cn(titleClass, 'h-7 md:h-9')} width="w-3/5" />
              <div className="mt-1 hidden h-[2.625rem] items-center justify-between border-b border-border-soft pb-2 md:flex">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="mt-4 hidden h-6 items-center md:flex">
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="mt-3 space-y-0 md:mt-1.5">
                <Line className="h-6" width="w-full" />
                <Line className="h-6" width="w-full" />
                <Line className="h-6" width="w-2/5" />
              </div>
              <div className="mt-4 h-6 md:mt-3">
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="mt-2 flex gap-3 md:gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-7 w-14 rounded-full md:h-[1.6875rem]" />
                ))}
              </div>
              <div className="mt-4 hidden h-12 items-center gap-3 md:flex">
                <Skeleton className="h-12 w-8 rounded-full" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-12 w-8 rounded-full" />
              </div>
              <div className="mt-3 md:mt-4">
                {Array.from({ length: INFO_LINES }, (_, index) => (
                  <Line key={index} className={cn(infoLineClass, 'h-8')} width={index % 2 ? 'w-1/2' : 'w-2/5'} />
                ))}
              </div>
              <div className="mt-1 hidden h-8 items-center md:flex">
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </div>
          <div className={tabsSectionClass}>
            <div className="flex h-[2.125rem] items-end gap-9 border-b border-border-soft pb-2 md:h-[2.375rem]">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="pt-4">
              {Array.from({ length: STORY_LINES }, (_, index) => (
                <Line key={index} className="h-6" width={index === STORY_LINES - 1 ? 'w-1/3' : 'w-full'} />
              ))}
            </div>
          </div>
          <div className={collectionSectionClass}>
            <div className="flex h-8 items-start border-b border-border-soft pb-2 md:h-[2.0625rem]">
              <Skeleton className="h-4 w-44" />
            </div>
            <div className={cn(carouselTrackClass, 'mt-7 overflow-hidden')}>
              {Array.from({ length: CAROUSEL_ITEMS }, (_, index) => (
                <div key={index} className={carouselItemClass}>
                  <NftCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
      <div className={mobileBarClass} aria-hidden="true">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-6 w-24" />
      </div>
    </>
  )
}
