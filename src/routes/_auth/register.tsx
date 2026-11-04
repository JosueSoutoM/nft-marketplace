import { createFileRoute } from '@tanstack/react-router'
import { RegisterForm } from '@/components/auth/register-form'

export const Route = createFileRoute('/_auth/register')({
  component: RegisterRoute,
})

function RegisterRoute() {
  const { redirect } = Route.useSearch()
  return <RegisterForm redirect={redirect} />
}
