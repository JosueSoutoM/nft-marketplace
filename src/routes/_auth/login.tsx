import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/login-form'

export const Route = createFileRoute('/_auth/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect, reason } = Route.useSearch()
  return <LoginForm key={reason ?? 'login'} redirect={redirect} notice={reason} />
}
