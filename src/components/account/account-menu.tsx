import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, User, Wallet } from 'lucide-react'
import type { SessionUser } from '@/api/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/hooks/use-auth'

type AccountMenuProps = {
  user: SessionUser | null
  triggerClassName?: string
  side?: 'top' | 'bottom'
  children: ReactNode
}

export function AccountMenu({ user, triggerClassName, side = 'bottom', children }: AccountMenuProps) {
  const logout = useLogout()
  const name = user?.displayName ?? 'Minha conta'

  function signOut() {
    if (logout.isPending) {
      return
    }
    logout.mutate()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Menu da conta de ${name}`} className={triggerClassName}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side}>
        <DropdownMenuLabel>
          <span className="block font-bold">{name}</span>
          {user && <span className="block truncate text-caption text-text-secondary">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" preload={false}>
            <User aria-hidden="true" />
            Dados do perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets" preload={false}>
            <Wallet aria-hidden="true" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={logout.isPending} className="font-bold">
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
