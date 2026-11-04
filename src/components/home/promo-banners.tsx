import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'
import type { CatalogSearchInput } from '@/lib/catalog-search'

type Promo = {
  id: string
  title: string
  description: string
  image: string
  search: CatalogSearchInput
}

const PROMOS: Promo[] = [
  {
    id: 'genesis',
    title: 'Lançamentos gênesis de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: 'emerald-ape',
    search: { segment: 'new' },
  },
  {
    id: 'curated',
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: 'ivory-baron',
    search: { category: ['digital-art'] },
  },
]

export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="pt-16 md:pt-24 xl:pt-[8.25rem]">
      <Container className="grid gap-6 lg:grid-cols-2 xl:gap-[1.875rem]">
        {PROMOS.map((promo) => (
          <article
            key={promo.id}
            aria-labelledby={`promo-${promo.id}`}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-2xl bg-surface-card xl:grid-cols-[17.9375rem_minmax(0,1fr)]"
          >
            <img
              src={`/images/nfts/${promo.image}-400.webp`}
              alt=""
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              className="aspect-[287/250] h-full w-full rounded-2xl object-cover object-top"
            />
            <div className="flex flex-col items-end justify-center gap-2.5 py-5 pr-5 pl-4 text-right">
              <h2 id={`promo-${promo.id}`} className="text-body font-bold text-foreground">
                {promo.title}
              </h2>
              <p className="text-[0.8125rem] leading-[1.375rem] text-text-secondary">{promo.description}</p>
              <Button asChild className="mt-1 h-10 w-[8.75rem] px-0 text-body-sm">
                <Link to="/" search={promo.search} hash={CATALOG_HASH}>
                  Explorar
                  <ArrowRight className="size-4" aria-hidden="true" />
                  <span className="sr-only">: {promo.title}</span>
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </Container>
    </section>
  )
}
