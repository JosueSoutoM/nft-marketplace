import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeaturedNfts } from '@/hooks/use-nft-list'
import { cn } from '@/lib/utils'
import { HERO_SLIDE_COUNT, splitFeatured } from './featured'

export function Hero() {
  const featured = useFeaturedNfts()
  const slides = featured.data ? splitFeatured(featured.data).slides : []
  const [selected, setSelected] = useState(0)
  const activeIndex = selected < slides.length ? selected : 0
  const active = slides[activeIndex]
  const preview = slides.length > 1 ? slides[(activeIndex + 1) % slides.length] : undefined

  return (
    <section aria-labelledby="hero-title" className="pt-4 md:pt-8">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-[#5a3a24] via-surface-raised to-surface-card p-4 pb-9 md:overflow-visible md:rounded-none md:bg-none md:p-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/3 size-56 rounded-full bg-primary/10 md:hidden"
          />
          <div className="relative grid grid-cols-[minmax(0,1fr)_8.625rem] items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_28.125rem]">
            <HeroCopy />
            <div className="relative">
              {featured.isPending ? (
                <Skeleton className="aspect-square w-full rounded-2xl md:rounded-3xl" />
              ) : active ? (
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: active.id }}
                  className="block rounded-2xl md:rounded-3xl"
                >
                  <NftImage
                    image={active.image}
                    sizes="(min-width: 768px) 450px, 138px"
                    loading="eager"
                    fetchPriority="high"
                    className="aspect-square w-full rounded-2xl bg-surface-raised object-cover md:rounded-3xl"
                  />
                </Link>
              ) : (
                <div className="aspect-square w-full rounded-2xl bg-surface-raised md:rounded-3xl" />
              )}
              {preview && (
                <NftImage
                  image={preview.image}
                  alt=""
                  sizes="58px"
                  className="absolute -bottom-2 left-3.5 size-[3.625rem] rounded-xl border-2 border-surface-raised object-cover md:hidden"
                />
              )}
            </div>
          </div>
          <HeroDots
            slides={slides}
            loading={featured.isPending}
            activeIndex={activeIndex}
            onSelect={setSelected}
          />
        </div>
      </Container>
    </section>
  )
}

function HeroCopy() {
  return (
    <div className="flex flex-col justify-center md:px-10 md:pb-24">
      <p className="text-caption text-foreground md:text-body-sm">Bem-vindo à Kurio</p>
      <h1
        id="hero-title"
        className="mt-1 text-display-sm text-foreground uppercase md:mt-2 md:text-display lg:max-w-[33rem]"
      >
        <span className="md:hidden">Seja dono da cultura digital</span>
        <span className="hidden md:inline">Seja dono do futuro da arte digital</span>
      </h1>
      <p className="mt-1 text-caption leading-[1.125rem] text-text-secondary md:mt-3 md:max-w-[35rem] md:text-body-sm md:leading-6">
        <span className="md:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
        <span className="hidden md:inline">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
          apoie artistas e tenha uma parte da cultura da internet.
        </span>
      </p>
      <Link
        to="/"
        hash={CATALOG_HASH}
        className="mt-1 inline-flex items-center gap-2 self-start text-caption font-bold text-text-accent uppercase md:hidden"
      >
        Explorar
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Button asChild className="mt-8 hidden self-start px-7 font-bold uppercase md:inline-flex">
        <Link to="/" hash={CATALOG_HASH}>
          Explorar
        </Link>
      </Button>
    </div>
  )
}

type HeroDotsProps = {
  slides: NftSummary[]
  loading: boolean
  activeIndex: number
  onSelect: (index: number) => void
}

function HeroDots({ slides, loading, activeIndex, onSelect }: HeroDotsProps) {
  const dotClass = 'size-2 rounded-full bg-primary transition-opacity'

  return (
    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 md:right-[23rem] lg:right-[35rem] md:bottom-10 md:left-auto md:translate-x-0">
      {loading || slides.length === 0
        ? Array.from({ length: HERO_SLIDE_COUNT }, (_, index) => (
            <span key={index} aria-hidden="true" className="flex size-6 items-center justify-center">
              <span className={cn(dotClass, 'opacity-40')} />
            </span>
          ))
        : slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Mostrar destaque ${index + 1} de ${slides.length}: ${slide.name}`}
              aria-pressed={index === activeIndex}
              onClick={() => onSelect(index)}
              className="flex size-6 items-center justify-center rounded-full"
            >
              <span className={cn(dotClass, index === activeIndex ? 'opacity-100' : 'opacity-50')} />
            </button>
          ))}
    </div>
  )
}
