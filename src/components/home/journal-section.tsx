import { ComingSoonButton } from '@/components/layout/coming-soon'
import { Container } from '@/components/layout/container'

type JournalPost = {
  id: string
  date: string
  dateLabel: string
  readingTime: string
  title: string
  excerpt: string
  image: string
}

const POSTS: JournalPost[] = [
  {
    id: 'ownership',
    date: '2026-09-12',
    dateLabel: '12 de setembro',
    readingTime: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: 'ivory-baron',
  },
  {
    id: 'artists',
    date: '2026-09-13',
    dateLabel: '13 de setembro',
    readingTime: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    image: 'emerald-ape',
  },
  {
    id: 'rarity',
    date: '2026-09-15',
    dateLabel: '15 de setembro',
    readingTime: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: 'sage-nomad',
  },
  {
    id: 'wallet',
    date: '2026-09-15',
    dateLabel: '15 de setembro',
    readingTime: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: 'golden-beat',
  },
]

export function JournalSection() {
  return (
    <section aria-labelledby="journal-title" className="pt-16 md:pt-24 xl:pt-[7.5rem]">
      <Container>
        <h2 id="journal-title" className="text-center text-heading text-foreground">
          Diário da Cunhagem
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-center text-body-sm text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POSTS.map((post) => (
            <li key={post.id}>
              <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface-card">
                <img
                  src={`/images/nfts/${post.image}-400.webp`}
                  alt=""
                  width={400}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="h-[12.1875rem] w-full object-cover object-top"
                />
                <div className="flex flex-1 flex-col px-4 pt-4 pb-5">
                  <p className="text-caption text-text-secondary">
                    <time dateTime={post.date}>{post.dateLabel}</time>
                    <span aria-hidden="true" className="px-2">
                      |
                    </span>
                    <span className="sr-only">, </span>
                    {post.readingTime}
                  </p>
                  <h3 className="mt-2.5 text-body leading-[1.375rem] font-bold text-foreground">{post.title}</h3>
                  <p className="mt-2 text-caption text-text-secondary">{post.excerpt}</p>
                  <ComingSoonButton
                    feature="Diário da Cunhagem"
                    className="mt-3 self-start text-caption font-bold text-text-accent hover:underline"
                  >
                    Ler mais <span aria-hidden="true">→</span>
                    <span className="sr-only">: {post.title}</span>
                  </ComingSoonButton>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
