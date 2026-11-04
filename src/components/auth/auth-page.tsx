import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/layout/logo'
import { AUTH_COPY, type AuthMode } from './auth-copy'
import { SocialDivider, SocialSignIn } from './auth-parts'

type AuthPageProps = {
  mode: AuthMode
  redirect?: string
  children: ReactNode
}

export function AuthPage({ mode, redirect, children }: AuthPageProps) {
  const copy = AUTH_COPY[mode]

  return (
    <Container className="pt-28 pb-12">
      <div className="flex justify-center">
        <Logo className="text-[length:2.25rem] leading-12 tracking-[0.12em]" />
      </div>
      <h1 className="mt-18 text-center text-display-sm text-foreground">{copy.pageTitle}</h1>
      <div className="mt-8">{children}</div>
      <SocialDivider className="mt-11" />
      <SocialSignIn className="mt-4" />
      <p className="mt-12 text-center text-[length:0.9375rem] text-text-secondary">
        {copy.switchPrompt}{' '}
        <Link
          to={mode === 'login' ? '/register' : '/login'}
          search={{ redirect }}
          className="text-text-secondary underline underline-offset-4 transition-colors hover:text-text-accent"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </Container>
  )
}
