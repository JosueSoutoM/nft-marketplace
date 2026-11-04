import { AccountLayout } from '@/components/account/account-nav'
import { AccountFormSkeleton, AccountLoadError } from '@/components/account/account-states'
import { useProfile } from '@/hooks/use-profile'
import { ProfileForm } from './profile-form'

const TITLE = 'Perfil do colecionador'

export function ProfilePage() {
  const profile = useProfile()

  return (
    <AccountLayout>
      {profile.data ? (
        <ProfileForm key={profile.data.id} profile={profile.data} />
      ) : profile.isError ? (
        <AccountLoadError
          title={TITLE}
          message="Não foi possível carregar seu perfil."
          retrying={profile.isFetching}
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <AccountFormSkeleton title={TITLE} fields={6} />
      )}
    </AccountLayout>
  )
}
