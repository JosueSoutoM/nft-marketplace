import type { SessionUser } from '@/api/contracts'
import { cn } from '@/lib/utils'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

type UserAvatarProps = {
  user: Pick<SessionUser, 'displayName' | 'avatarUrl'>
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary bg-surface-raised text-caption font-bold text-text-accent',
        className,
      )}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" width={36} height={36} className="size-full object-cover" />
      ) : (
        initialsOf(user.displayName)
      )}
    </span>
  )
}
