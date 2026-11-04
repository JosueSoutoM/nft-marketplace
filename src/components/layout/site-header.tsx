import { Link } from '@tanstack/react-router'
import { ChevronDown, CircleUser, LogIn, ShoppingCart } from 'lucide-react'
import { AccountMenu } from '@/components/account/account-menu'
import { UserAvatar } from '@/components/account/user-avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/hooks/use-session'
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

function HeaderAccount({ redirect }: { redirect: string | undefined }) {
  const session = useSession()

  if (session.status === 'anonymous') {
    return (
      <Button asChild size="sm" className="ml-2 font-medium">
        <Link to="/login" search={{ redirect }}>
          <LogIn aria-hidden="true" />
          Entrar
        </Link>
      </Button>
    )
  }
  if (session.status === 'pending' && !session.isError) {
    return (
      <div className="ml-2 flex h-10 w-36 items-center gap-2" aria-hidden="true">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-4 flex-1" />
      </div>
    )
  }
  const user = session.user
  return (
    <AccountMenu
      user={user}
      triggerClassName="ml-2 flex h-10 max-w-48 items-center gap-2 rounded-md pr-1 text-body-sm font-medium text-foreground transition-colors hover:text-text-accent data-[state=open]:text-text-accent"
    >
      {user ? <UserAvatar user={user} /> : <CircleUser className="size-9 text-text-accent" aria-hidden="true" />}
      <span className="truncate">{user?.displayName ?? 'Minha conta'}</span>
      <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
    </AccountMenu>
  )
}

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
                className={cn(navItemClass, (section === 'market' || section === 'favorites') && activeNavItemClass)}
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
          <HeaderAccount redirect={redirect} />
        </div>
      </Container>
    </header>
  )
}
