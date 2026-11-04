import { AccountLayout } from '@/components/account/account-nav'
import { AccountFormSkeleton, AccountLoadError } from '@/components/account/account-states'
import { useNetworks } from '@/hooks/use-networks'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { useWallets } from '@/hooks/use-wallets'
import { WalletSection } from './wallet-section'

const TITLE = 'Carteiras'

export function WalletsPage() {
  const { userId } = useSession()
  const wallets = useWallets()
  const networks = useNetworks()
  const profile = useProfile()

  if (wallets.isError || networks.isError) {
    return (
      <AccountLayout>
        <AccountLoadError
          title={TITLE}
          message="Não foi possível carregar suas carteiras."
          retrying={wallets.isFetching || networks.isFetching}
          onRetry={() => {
            void wallets.refetch()
            void networks.refetch()
          }}
        />
      </AccountLayout>
    )
  }

  if (!wallets.data || !networks.data || profile.isPending) {
    return (
      <AccountLayout>
        <AccountFormSkeleton title={TITLE} fields={10} />
      </AccountLayout>
    )
  }

  const primary = wallets.data.find((wallet) => wallet.slot === 'primary')
  const secondary = wallets.data.find((wallet) => wallet.slot === 'secondary')

  return (
    <AccountLayout>
      <div key={userId}>
        <h1 className="sr-only">{TITLE}</h1>
        <div className="flex flex-col gap-12">
          <WalletSection slot="primary" wallet={primary} primary={primary} profile={profile.data} networks={networks.data} />
          <WalletSection slot="secondary" wallet={secondary} primary={primary} profile={profile.data} networks={networks.data} />
        </div>
      </div>
    </AccountLayout>
  )
}
