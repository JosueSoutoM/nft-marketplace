import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { focusMainContentIfLost } from '@/lib/focus'
import { isPrivatePath } from '@/lib/redirect'
import { cn } from '@/lib/utils'
import { AUTH_COPY, type AuthMode } from './auth-copy'
import { SocialDivider, SocialSignIn } from './auth-parts'

const tabClass = 'px-2 text-[length:1.25rem] leading-6 font-medium text-foreground transition-colors hover:text-text-accent'

type AuthDialogProps = {
  mode: AuthMode
  redirect?: string
  children: ReactNode
}

export function AuthDialog({ mode, redirect, children }: AuthDialogProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)
  const [returnFocus] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  const copy = AUTH_COPY[mode]

  async function close() {
    const target = redirect && !isPrivatePath(router, redirect) ? redirect : '/'
    await navigate({ href: target })
    if (returnFocus?.isConnected && returnFocus !== document.body) {
      returnFocus.focus()
      return
    }
    focusMainContentIfLost()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && void close()}>
      <DialogContent
        ref={contentRef}
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          contentRef.current?.querySelector('input')?.focus()
        }}
        overlayClassName="bg-transparent"
        className="top-[clamp(1rem,calc(100dvh-46rem),10rem)] block max-h-[calc(100dvh-2rem)] w-[31.5625rem] max-w-[calc(100%-2rem)] translate-y-0 overflow-y-auto rounded-sm border-b-8 border-primary bg-surface-card p-0 pt-12 pb-24 shadow-2xl ring-0 sm:max-w-[31.5625rem]"
      >
        <DialogTitle className="sr-only">{copy.title}</DialogTitle>
        <nav aria-label="Acesso à conta" className="flex items-center justify-center">
          <Link
            to="/login"
            search={{ redirect }}
            aria-current={mode === 'login' ? 'page' : undefined}
            className={cn(tabClass, mode === 'login' && 'text-text-accent')}
          >
            Entrar
          </Link>
          <span aria-hidden="true" className="h-6 w-px bg-primary" />
          <Link
            to="/register"
            search={{ redirect }}
            aria-current={mode === 'register' ? 'page' : undefined}
            className={cn(tabClass, mode === 'register' && 'text-text-accent')}
          >
            Criar conta
          </Link>
        </nav>
        <DialogDescription className="mx-auto mt-10 mb-6 max-w-[25.5rem] px-4 text-center text-[length:0.8125rem] leading-4 text-foreground">
          {copy.description}
        </DialogDescription>
        <div className="mx-auto w-full max-w-[21.4375rem]">{children}</div>
        <SocialDivider className="mt-8" />
        <SocialSignIn className="mx-auto mt-5 w-full max-w-[21.4375rem]" />
        <DialogClose className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-sm text-text-accent transition-colors hover:text-primary-light">
          <XIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
