import type { ComponentType, FormEvent, ReactNode, SVGProps } from 'react'
import { Link } from '@tanstack/react-router'
import type { NftCategoryId } from '@/api/contracts'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/social-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ComingSoonButton } from './coming-soon'
import { notifyComingSoon } from './notify-coming-soon'
import { Container } from './container'
import { CATALOG_HASH } from './use-active-section'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    description: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    description: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    description:
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const HELP_LINKS = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]

const PROFILE_COMING_SOON = ['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse']

const COLLECTIONS: Array<{ label: string; category: NftCategoryId }> = [
  { label: 'Arte digital', category: 'digital-art' },
  { label: 'Fotografia', category: 'photography' },
  { label: 'Música', category: 'music' },
  { label: 'Arte 3D', category: '3d-art' },
  { label: 'Utilidade', category: 'utility' },
]

const SOCIAL_NETWORKS: Array<{ name: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { name: 'Facebook', icon: FacebookIcon },
  { name: 'Instagram', icon: InstagramIcon },
  { name: 'Twitter', icon: TwitterIcon },
  { name: 'LinkedIn', icon: LinkedinIcon },
  { name: 'YouTube', icon: YoutubeIcon },
]

const WALLETS = ['MetaMask', 'WalletConnect', 'Coinbase']

const columnGrid = 'lg:grid-cols-[1fr_1fr_1fr_14.5rem]'
const footerLinkClass =
  'text-left text-body-sm leading-[1.875rem] text-foreground transition-colors hover:text-text-accent'

export function SiteFooter() {
  return (
    <footer className="mt-16 md:mt-24">
      <Container>
        <div className="bg-surface-card">
          <FeaturesRow />
          <ContactBand />
          <FooterLinks />
        </div>
      </Container>
      <p className="py-5 text-center text-body-sm text-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}

function FeaturesRow() {
  return (
    <div className="grid gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] lg:gap-0 lg:px-12 lg:py-9">
      {FEATURES.map((feature, index) => (
        <section
          key={feature.title}
          className={index > 0 ? 'lg:border-l lg:border-primary lg:pl-4' : undefined}
        >
          <span
            aria-hidden="true"
            className="flex size-[4.5rem] items-center justify-center rounded-full bg-primary text-title text-primary-foreground"
          >
            {feature.letter}
          </span>
          <h2 className="mt-3 text-body-lg font-bold text-foreground">{feature.title}</h2>
          <p className="mt-1 max-w-[12.5rem] text-body-sm leading-[1.375rem] text-muted-foreground">
            {feature.description}
          </p>
        </section>
      ))}
      <NewsletterForm />
    </div>
  )
}

function NewsletterForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    notifyComingSoon('Newsletter')
  }

  return (
    <section aria-labelledby="newsletter-title" className="lg:border-l lg:border-primary lg:pl-4">
      <h2 id="newsletter-title" className="text-body-lg leading-4 font-bold text-foreground">
        Antecipe-se ao próximo lançamento
      </h2>
      <form onSubmit={handleSubmit} noValidate className="mt-3 flex">
        <label htmlFor="newsletter-email" className="sr-only">
          Seu e-mail
        </label>
        <Input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          className="rounded-r-none border-0 bg-surface-dark"
        />
        <Button
          type="submit"
          aria-disabled="true"
          className="rounded-l-none px-4 text-body-lg font-bold"
        >
          Enviar
          <span className="sr-only"> (em breve)</span>
        </Button>
      </form>
      <p className="mt-4 text-caption leading-[1.375rem] text-muted-foreground">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </section>
  )
}

function ContactBand() {
  return (
    <div
      className={`grid gap-3 bg-surface-dark px-6 py-6 text-body-sm text-foreground md:grid-cols-2 lg:items-center lg:px-8 lg:py-5 ${columnGrid}`}
    >
      <p className="font-bold tracking-[0.08em]">KURIO</p>
      <p className="max-w-[17rem]">Feito para colecionadores, criadores e cultura</p>
      <p>contato@email.com</p>
      <p>+55 11 4002 8922</p>
    </div>
  )
}

function FooterLinks() {
  return (
    <nav
      aria-label="Rodapé"
      className={`grid grid-cols-1 gap-8 px-6 py-8 sm:grid-cols-2 lg:gap-x-0 lg:px-8 ${columnGrid}`}
    >
      <FooterColumn title="Meu perfil">
        <li>
          <Link to="/profile" className={footerLinkClass}>
            Meu perfil
          </Link>
        </li>
        {PROFILE_COMING_SOON.map((label) => (
          <li key={label}>
            <ComingSoonButton feature={label} className={footerLinkClass}>
              {label}
            </ComingSoonButton>
          </li>
        ))}
      </FooterColumn>

      <FooterColumn title="Central de ajuda">
        {HELP_LINKS.map((label) => (
          <li key={label}>
            <ComingSoonButton feature={label} className={footerLinkClass}>
              {label}
            </ComingSoonButton>
          </li>
        ))}
      </FooterColumn>

      <FooterColumn title="Coleções">
        {COLLECTIONS.map(({ label, category }) => (
          <li key={label}>
            <Link to="/" search={{ category: [category] }} hash={CATALOG_HASH} className={footerLinkClass}>
              {label}
            </Link>
          </li>
        ))}
      </FooterColumn>

      <div>
        <h2 className="text-body-lg font-bold text-foreground">Redes sociais</h2>
        <ul className="mt-3 flex gap-2">
          {SOCIAL_NETWORKS.map(({ name, icon: Icon }) => (
            <li key={name}>
              <ComingSoonButton
                feature={name}
                aria-label={name}
                className="flex size-8 items-center justify-center rounded-md border border-primary text-primary transition-colors hover:bg-surface-raised"
              >
                <Icon className="size-4" />
              </ComingSoonButton>
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-body-lg font-bold text-foreground">Carteiras compatíveis</h2>
        <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-md border border-border-soft bg-surface-dark px-2.5 py-1.5 text-[0.5625rem] font-bold text-text-accent uppercase">
          {WALLETS.map((wallet, index) => (
            <span key={wallet} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">•</span>}
              {wallet}
            </span>
          ))}
        </p>
      </div>
    </nav>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-body-lg font-bold text-foreground">{title}</h2>
      <ul className="mt-2">{children}</ul>
    </div>
  )
}
