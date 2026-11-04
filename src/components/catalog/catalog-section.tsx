import { useEffect, useRef, type RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Heart, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { NFT_DEFAULT_PAGE_SIZE, type NftListResponse } from '@/api/contracts'
import { FeaturedSpotlight } from '@/components/home/featured-spotlight'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCatalogSearch, useUpdateCatalogSearch } from '@/hooks/use-catalog-search'
import { useCatalogList } from '@/hooks/use-nft-list'
import { useSession } from '@/hooks/use-session'
import { announce } from '@/lib/announcer'
import { hasActiveFilters, toNftListQuery } from '@/lib/catalog-search'
import { CatalogFilters } from './catalog-filters'
import { CatalogPagination } from './catalog-pagination'
import { CatalogGrid, CatalogGridSkeleton, CatalogMessage } from './catalog-results'
import { SegmentTabs, SortSelect } from './catalog-toolbar'

function describeResults({ total, page, totalPages }: NftListResponse, favorites: boolean): string {
  const noun = favorites ? ['favorito', 'favoritos'] : ['NFT', 'NFTs']
  const count =
    total === 0
      ? `Nenhum ${noun[0]} encontrado.`
      : total === 1
        ? `1 ${noun[0]} encontrado.`
        : `${total} ${noun[1]} encontrados.`
  return totalPages > 1 && page <= totalPages ? `${count} Página ${page} de ${totalPages}.` : count
}

type CatalogSectionProps = {
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  filtersReturnFocusRef: RefObject<HTMLElement | null>
}

export function CatalogSection({ filtersOpen, onFiltersOpenChange, filtersReturnFocusRef }: CatalogSectionProps) {
  const search = useCatalogSearch()
  const { updateFilters, goToPage } = useUpdateCatalogSearch()
  const { userId } = useSession()
  const listQuery = toNftListQuery(search)
  const list = useCatalogList(listQuery, search.favorites ? { userId } : null)
  const sectionRef = useRef<HTMLElement>(null)
  const announcedKeyRef = useRef<string | null>(null)
  const listKey = JSON.stringify([search.favorites, listQuery])
  const data = list.data

  useEffect(() => {
    if (!list.isSuccess || list.isPlaceholderData) {
      return
    }
    if (announcedKeyRef.current !== null && announcedKeyRef.current !== listKey) {
      announce(describeResults(list.data, search.favorites))
    }
    announcedKeyRef.current = listKey
  }, [list.isSuccess, list.isPlaceholderData, list.data, listKey, search.favorites])

  function clearFilters() {
    void updateFilters({ q: '', category: [], network: [], priceMin: undefined, priceMax: undefined, segment: 'all' })
  }

  function changePage(page: number) {
    void goToPage(page)
    sectionRef.current?.scrollIntoView({ block: 'start' })
  }

  function renderResults() {
    if (list.isPending || (list.isError && list.isFetching)) {
      return <CatalogGridSkeleton count={NFT_DEFAULT_PAGE_SIZE} />
    }
    if (!data) {
      return (
        <CatalogMessage
          tone="error"
          title={search.favorites ? 'Não foi possível carregar seus favoritos' : 'Não foi possível carregar o catálogo'}
          description={list.error?.message ?? 'Tente novamente em instantes.'}
          actionLabel="Tentar novamente"
          onAction={() => void list.refetch()}
        />
      )
    }
    if (data.items.length > 0) {
      return <CatalogGrid items={data.items} />
    }
    if (data.total > 0) {
      return (
        <CatalogMessage
          tone="empty"
          title="Página não encontrada"
          description={`O catálogo tem ${data.totalPages} página${data.totalPages > 1 ? 's' : ''} para estes filtros.`}
          actionLabel="Ir para a primeira página"
          onAction={() => changePage(1)}
        />
      )
    }
    if (search.favorites && !hasActiveFilters(search)) {
      return (
        <CatalogMessage
          tone="favorites"
          title="Você ainda não tem favoritos"
          description="Toque no coração de um NFT para guardá-lo aqui e encontrá-lo depois."
          action={
            <Button asChild className="mt-2 font-bold">
              <Link to="/" hash={CATALOG_HASH}>
                Explorar o catálogo
              </Link>
            </Button>
          }
        />
      )
    }
    if (search.favorites) {
      return (
        <CatalogMessage
          tone="empty"
          title="Nenhum favorito encontrado"
          description="Nenhum dos seus favoritos corresponde à busca e aos filtros selecionados. Ajuste ou limpe os filtros para ver todos os seus favoritos."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      )
    }
    if (hasActiveFilters(search)) {
      return (
        <CatalogMessage
          tone="empty"
          title="Nenhum NFT encontrado"
          description="Nenhum NFT corresponde à busca e aos filtros selecionados. Ajuste os filtros ou limpe-os para ver todo o catálogo."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      )
    }
    return (
      <CatalogMessage
        tone="empty"
        title="Nenhum NFT disponível"
        description="O catálogo está vazio no momento. Volte mais tarde ou atualize a página."
        actionLabel="Atualizar"
        onAction={() => void list.refetch()}
      />
    )
  }

  const filtersProps = {
    search,
    facets: data?.facets,
    onChange: updateFilters,
    onClear: clearFilters,
  }
  const refreshing = list.isFetching && !list.isPending && !list.isError

  return (
    <section
      id={CATALOG_HASH}
      ref={sectionRef}
      aria-labelledby="catalog-title"
      className="scroll-mt-4 pt-6 md:pt-16 lg:pt-24"
    >
      <h2 id="catalog-title" className="sr-only">
        {search.favorites ? 'Meus favoritos' : 'Catálogo de NFTs'}
      </h2>
      <Container className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[19.375rem_minmax(0,1fr)] xl:gap-[2.9375rem]">
        <aside aria-label="Filtros do catálogo" className="hidden lg:block">
          <CatalogFilters idPrefix="sidebar" {...filtersProps} />
          <div className="mt-7">
            <FeaturedSpotlight />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <SegmentTabs segment={search.segment} onChange={(segment) => void updateFilters({ segment })} />
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex lg:hidden"
                onClick={(event) => {
                  filtersReturnFocusRef.current = event.currentTarget
                  onFiltersOpenChange(true)
                }}
              >
                <SlidersHorizontal aria-hidden="true" />
                Filtros
              </Button>
              <SortSelect sort={search.sort} onChange={(sort) => void updateFilters({ sort })} />
            </div>
          </div>

          {search.favorites && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-body-sm text-text-secondary">
              <Heart className="size-4 fill-current text-text-accent" aria-hidden="true" />
              Mostrando apenas os seus favoritos.
              <button
                type="button"
                onClick={() => void updateFilters({ favorites: false })}
                className="inline-flex items-center gap-1 rounded-sm text-text-accent hover:underline"
              >
                Ver todo o catálogo
              </button>
            </p>
          )}

          {search.q && (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-body-sm text-text-secondary">
              Resultados para <span className="font-bold text-foreground">“{search.q}”</span>
              <button
                type="button"
                onClick={() => void updateFilters({ q: '' })}
                className="inline-flex items-center gap-1 rounded-sm text-text-accent hover:underline"
              >
                <X className="size-4" aria-hidden="true" />
                Limpar busca
              </button>
            </p>
          )}

          <div className="relative mt-6 md:mt-7" aria-busy={list.isFetching}>
            {refreshing && (
              <p className="pointer-events-none absolute inset-x-0 -top-5 z-10 flex justify-center md:-top-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1 text-caption text-text-secondary shadow">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Atualizando…
                </span>
              </p>
            )}
            <div className={refreshing && list.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {renderResults()}
            </div>
          </div>

          {data && data.items.length > 0 && (
            <div className="mt-12 md:mt-20">
              <CatalogPagination page={data.page} totalPages={data.totalPages} onPageChange={changePage} />
            </div>
          )}
        </div>
      </Container>

      <Sheet open={filtersOpen} onOpenChange={onFiltersOpenChange}>
        <SheetContent
          side="left"
          className="lg:hidden"
          onCloseAutoFocus={(event) => {
            const target = filtersReturnFocusRef.current
            if (target) {
              event.preventDefault()
              target.focus()
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados são atualizados a cada alteração.</SheetDescription>
          </SheetHeader>
          <CatalogFilters idPrefix="drawer" className="bg-transparent py-0" {...filtersProps} />
          <SheetFooter>
            <Button className="font-bold" onClick={() => onFiltersOpenChange(false)}>
              {data ? `Ver ${data.total} resultado${data.total === 1 ? '' : 's'}` : 'Ver resultados'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  )
}
