import { Link } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComingSoonButton } from './coming-soon'
import { useActiveSection } from './use-active-section'

const tabClass =
  'flex size-12 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-accent'
const activeTabClass = 'text-text-accent'

export function MobileTabBar() {
  const section = useActiveSection()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="relative">
        <div className="h-20 rounded-t-[2rem] bg-surface-card pb-[env(safe-area-inset-bottom)] [mask-image:radial-gradient(circle_at_50%_0,transparent_2.6rem,black_2.65rem)]">
          <ul className="grid h-full grid-cols-5 items-center justify-items-center px-4">
            <li>
              <Link
                to="/"
                aria-label="Início"
                aria-current={section === 'home' ? 'page' : undefined}
                className={cn(tabClass, section === 'home' && activeTabClass)}
              >
                <House className="size-6" fill="currentColor" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <ComingSoonButton feature="Favoritos" aria-label="Favoritos" className={tabClass}>
                <Heart className="size-6" fill="currentColor" aria-hidden="true" />
              </ComingSoonButton>
            </li>
            <li aria-hidden="true" />
            <li>
              <Link
                to="/cart"
                aria-label="Carrinho"
                aria-current={section === 'cart' ? 'page' : undefined}
                className={cn(tabClass, section === 'cart' && activeTabClass)}
              >
                <ShoppingCart className="size-6" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                aria-label="Perfil"
                aria-current={section === 'profile' ? 'page' : undefined}
                className={cn(tabClass, section === 'profile' && activeTabClass)}
              >
                <User className="size-6" fill="currentColor" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
        <ComingSoonButton
          feature="Escanear"
          aria-label="Escanear"
          className="absolute -top-8 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-linear-to-b from-primary-light to-primary-dark text-ink shadow-lg"
        >
          <ScanLine className="size-7" aria-hidden="true" />
        </ComingSoonButton>
      </div>
    </nav>
  )
}
