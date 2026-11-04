import { Link } from '@tanstack/react-router'
import { LogIn, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ComingSoonButton } from './coming-soon'
import { Container } from './container'
import { HeaderSearch } from './header-search'
import { Logo } from './logo'
import { CATALOG_HASH, useActiveSection } from './use-active-section'
import { useLoginRedirect } from './use-login-redirect'

const navItemClass =
  'relative flex h-full items-center pb-1.5 text-body text-foreground transition-colors hover:text-text-accent'
const activeNavItemClass =
  'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary'
const iconLinkClass =
  'relative flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:text-text-accent'

export function SiteHeader() {
  const section = useActiveSection()
  const redirect = useLoginRedirect()

  return (
    <header className="hidden md:block">
      <Container className="flex h-17 items-center justify-between gap-4 border-b border-primary/60 pt-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Logo className="justify-self-start text-body-sm" />

        <nav aria-label="Navegação principal" className="h-full">
          <ul className="flex h-full items-center gap-6 lg:gap-10">
            <li className="h-full">
              <Link
                to="/"
                activeOptions={{ exact: true, includeHash: true }}
                aria-current={section === 'home' ? 'page' : undefined}
                className={cn(navItemClass, section === 'home' && activeNavItemClass)}
              >
                Início
              </Link>
            </li>
            <li className="h-full">
              <Link
                to="/"
                hash={CATALOG_HASH}
                activeOptions={{ exact: true, includeHash: true }}
                aria-current={section === 'market' ? 'page' : undefined}
                className={cn(navItemClass, section === 'market' && activeNavItemClass)}
              >
                Mercado
              </Link>
            </li>
            <li className="h-full">
              <ComingSoonButton feature="Criadores" className={navItemClass}>
                Criadores
              </ComingSoonButton>
            </li>
            <li className="h-full">
              <ComingSoonButton feature="Aprenda" className={navItemClass}>
                Aprenda
              </ComingSoonButton>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-2 justify-self-end lg:gap-4">
          <HeaderSearch className={iconLinkClass} />
          <Link
            to="/cart"
            aria-label="Carrinho"
            className={cn(iconLinkClass, section === 'cart' && 'text-text-accent')}
          >
            <ShoppingCart className="size-6" aria-hidden="true" />
          </Link>
          <Button asChild size="sm" className="ml-2 font-medium">
            <Link to="/login" search={{ redirect }}>
              <LogIn aria-hidden="true" />
              Entrar
            </Link>
          </Button>
        </div>
      </Container>
    </header>
  )
}
