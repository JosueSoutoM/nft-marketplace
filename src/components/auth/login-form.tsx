import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toApiError } from '@/api/errors'
import { ComingSoonButton } from '@/components/layout/coming-soon'
import { useLogin } from '@/hooks/use-auth'
import { focusMainContentIfLost } from '@/lib/focus'
import { SESSION_NOTICES, type SessionNotice } from '@/lib/session-end'
import { normalizeEmail, validateEmail } from '@/lib/validation'
import { AuthField, PasswordField } from './auth-field'
import { FormErrorSummary, SessionNoticeBanner, SubmitButton } from './auth-parts'
import { useAuthForm } from './use-auth-form'

const LABELS = { email: 'E-mail', password: 'Senha' }

type LoginFormProps = {
  redirect?: string
  notice?: SessionNotice
}

export function LoginForm({ redirect, notice }: LoginFormProps) {
  const summaryId = useId()
  const navigate = useNavigate()
  const login = useLogin()
  const form = useAuthForm({ email: '', password: '' }, LABELS)
  const [completed, setCompleted] = useState(false)
  const pending = login.isPending || completed

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    const email = normalizeEmail(form.values.email)
    const errors = {
      email: validateEmail(email) ?? undefined,
      password: form.values.password ? undefined : 'Informe a senha.',
    }
    if (errors.email || errors.password) {
      form.fail(errors)
      return
    }
    try {
      await login.mutateAsync({ email, password: form.values.password })
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.code === 'INVALID_CREDENTIALS') {
        form.fail({}, 'E-mail ou senha incorretos. Confira os dados e tente novamente.')
        return
      }
      form.failWithApiErrors(apiError.fieldErrors, apiError.message)
      return
    }
    setCompleted(true)
    await navigate({ href: redirect ?? '/', replace: true })
    focusMainContentIfLost()
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-describedby={summaryId}>
      {notice && <SessionNoticeBanner {...SESSION_NOTICES[notice]} />}
      <FormErrorSummary id={summaryId} summary={form.summary} />
      <div className="flex flex-col gap-3">
        <AuthField
          {...form.field('email')}
          label={LABELS.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="contato@email.com"
          required
        />
        <PasswordField
          {...form.field('password')}
          label={LABELS.password}
          autoComplete="current-password"
          placeholder="Senha"
          required
        />
      </div>
      <div className="mt-3 flex justify-end">
        <ComingSoonButton
          feature="Recuperação de senha"
          className="text-body-sm text-text-accent transition-colors hover:text-primary-light md:text-[length:0.8125rem]"
        >
          Esqueceu a senha?
        </ComingSoonButton>
      </div>
      <SubmitButton pending={pending} pendingLabel="Entrando…" className="mt-8 md:mt-6">
        Entrar
      </SubmitButton>
    </form>
  )
}
