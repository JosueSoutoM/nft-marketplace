import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Download, Heart, LogOut, MapPin, ShoppingCart, TrendingUp, TriangleAlert, User, type LucideIcon } from 'lucide-react'
import { ComingSoonButton } from '@/components/layout/coming-soon'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { useLogout } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const itemClass =
  'relative flex h-11 shrink-0 items-center gap-3 whitespace-nowrap px-4 text-body text-text-accent transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:h-[2.8125rem] lg:px-4'
const activeClass =
  'bg-surface-raised text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-primary lg:bg-transparent lg:after:inset-y-0 lg:after:left-0 lg:after:right-auto lg:after:h-auto lg:after:w-1.5'

function ItemContent({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <>
      <Icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {children}
    </>
  )
}

function SoonItem({ icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li className="flex">
      <ComingSoonButton feature={label} className={cn(itemClass, 'w-full')}>
        <ItemContent icon={icon}>{label}</ItemContent>
      </ComingSoonButton>
    </li>
  )
}

export function AccountNav() {
  const logout = useLogout()

  return (
    <nav aria-label="Meu perfil" className="min-w-0 rounded-sm bg-surface-card lg:pt-5">
      <p aria-hidden="true" className="hidden px-3.5 pb-2 text-display-sm text-foreground lg:block">
        Meu perfil
      </p>
      <ul className="flex overflow-x-auto lg:flex-col lg:overflow-visible">
        <li className="flex">
          <Link to="/profile" className={cn(itemClass, 'w-full')} activeProps={{ className: activeClass, 'aria-current': 'page' }}>
            <ItemContent icon={User}>Dados do perfil</ItemContent>
          </Link>
        </li>
        <li className="flex">
          <Link to="/wallets" className={cn(itemClass, 'w-full')} activeProps={{ className: activeClass, 'aria-current': 'page' }}>
            <ItemContent icon={MapPin}>Carteiras</ItemContent>
          </Link>
        </li>
        <SoonItem icon={ShoppingCart} label="Atividade" />
        <li className="flex">
          <Link to="/" search={{ favorites: true }} hash={CATALOG_HASH} className={cn(itemClass, 'w-full')}>
            <ItemContent icon={Heart}>Lista de interesse</ItemContent>
          </Link>
        </li>
        <SoonItem icon={TrendingUp} label="Ofertas" />
        <SoonItem icon={Download} label="Arquivos baixados" />
        <SoonItem icon={TriangleAlert} label="Suporte" />
        <li className="flex lg:mt-0 lg:border-t lg:border-border-soft lg:pt-1 lg:pb-3">
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className={cn(itemClass, 'w-full font-bold disabled:opacity-60')}
          >
            <ItemContent icon={LogOut}>Sair</ItemContent>
          </button>
        </li>
      </ul>
    </nav>
  )
}

export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[75rem] px-6 pt-6 pb-12 lg:grid lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:items-start lg:gap-7 lg:pt-8 xl:px-0">
      <AccountNav />
      <div className="mt-8 min-w-0 lg:mt-0">{children}</div>
    </div>
  )
}
