import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import googleIconUrl from '@/assets/icons/google.svg'
import { FacebookIcon } from '@/components/icons/social-icons'
import { ComingSoonButton } from '@/components/layout/coming-soon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FormSummary } from './use-auth-form'

export function FormErrorSummary({ id, summary }: { id: string; summary: FormSummary | null }) {
  return (
    <div id={id} role="alert" className={cn(summary && 'mb-3')}>
      {summary && (
        <p
          key={summary.id}
          className="rounded-sm border border-text-coral/60 bg-text-coral/10 px-3 py-2 text-caption text-foreground"
        >
          {summary.message}
        </p>
      )}
    </div>
  )
}

export function SessionNoticeBanner({ title, description }: { title: string; description: string }) {
  return (
    <div role="alert" className="mb-3 rounded-sm border border-amber/60 bg-amber/10 px-3 py-2 text-caption text-foreground">
      <p className="font-bold">{title}</p>
      <p>{description}</p>
    </div>
  )
}

type SubmitButtonProps = {
  pending: boolean
  children: ReactNode
  pendingLabel: string
  className?: string
}

export function SubmitButton({ pending, children, pendingLabel, className }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        'h-14 w-full rounded-lg text-[length:1.0625rem] font-bold md:h-11 md:rounded-sm md:text-[length:0.9375rem]',
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

const socialButtonClass =
  'flex h-10 w-full items-center justify-center gap-3 rounded-sm border border-border text-body-sm font-medium text-text-secondary transition-colors hover:border-border-soft hover:text-foreground md:text-[length:0.8125rem]'

export function SocialDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-5 text-body-sm text-foreground md:text-[length:0.8125rem]', className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span>Ou continue com</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

export function SocialSignIn({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3.5 md:gap-3', className)}>
      <ComingSoonButton feature="Continuar com Google" className={socialButtonClass}>
        <img src={googleIconUrl} alt="" width={20} height={20} className="size-5" />
        Continuar com Google
      </ComingSoonButton>
      <ComingSoonButton feature="Continuar com Facebook" className={socialButtonClass}>
        <FacebookIcon className="h-5 w-2.5 text-logo-facebook" />
        Continuar com Facebook
      </ComingSoonButton>
    </div>
  )
}
