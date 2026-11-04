import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toApiError } from '@/api/errors'
import { useRegister } from '@/hooks/use-auth'
import { focusMainContentIfLost } from '@/lib/focus'
import {
  normalizeEmail,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateUsername,
} from '@/lib/validation'
import { AuthField, PasswordField } from './auth-field'
import { FormErrorSummary, SubmitButton } from './auth-parts'
import { useAuthForm } from './use-auth-form'

const LABELS = {
  username: 'Nome de usuário',
  email: 'E-mail',
  password: 'Senha',
  passwordConfirmation: 'Confirmar senha',
}

export function RegisterForm({ redirect }: { redirect?: string }) {
  const summaryId = useId()
  const hintId = useId()
  const navigate = useNavigate()
  const registerAccount = useRegister()
  const form = useAuthForm({ username: '', email: '', password: '', passwordConfirmation: '' }, LABELS)
  const [completed, setCompleted] = useState(false)
  const pending = registerAccount.isPending || completed

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    const { password, passwordConfirmation } = form.values
    const username = form.values.username.trim()
    const email = normalizeEmail(form.values.email)
    const errors = {
      username: validateUsername(username) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validateNewPassword(password) ?? undefined,
      passwordConfirmation: validatePasswordConfirmation(password, passwordConfirmation) ?? undefined,
    }
    if (Object.values(errors).some(Boolean)) {
      form.fail(errors)
      return
    }
    try {
      await registerAccount.mutateAsync({ username, email, password, passwordConfirmation })
    } catch (error) {
      const apiError = toApiError(error)
      form.failWithApiErrors(apiError.fieldErrors, apiError.message)
      return
    }
    setCompleted(true)
    await navigate({ href: redirect ?? '/', replace: true })
    focusMainContentIfLost()
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-describedby={summaryId}>
      <FormErrorSummary id={summaryId} summary={form.summary} />
      <p id={hintId} className="sr-only">
        A senha precisa ter pelo menos 8 caracteres, com letras e números.
      </p>
      <div className="flex flex-col gap-3">
        <AuthField
          {...form.field('username')}
          label={LABELS.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Nome de usuário"
          required
        />
        <AuthField
          {...form.field('email')}
          label={LABELS.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Digite seu e-mail"
          required
        />
        <PasswordField
          {...form.field('password')}
          label={LABELS.password}
          autoComplete="new-password"
          placeholder="Senha"
          describedBy={hintId}
          required
        />
        <PasswordField
          {...form.field('passwordConfirmation')}
          label={LABELS.passwordConfirmation}
          autoComplete="new-password"
          placeholder="Confirmar senha"
          toggleClassName="md:hidden"
          required
        />
      </div>
      <SubmitButton pending={pending} pendingLabel="Criando conta…" className="mt-10 md:mt-6">
        <span className="md:hidden">Criar perfil</span>
        <span className="hidden md:inline">Criar conta</span>
      </SubmitButton>
    </form>
  )
}
