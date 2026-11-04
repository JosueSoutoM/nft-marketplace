export type AuthMode = 'login' | 'register'

export const AUTH_COPY: Record<
  AuthMode,
  { title: string; pageTitle: string; description: string; switchPrompt: string; switchLabel: string }
> = {
  login: {
    title: 'Entrar',
    pageTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    switchPrompt: 'Novo na Kurio?',
    switchLabel: 'Crie uma conta',
  },
  register: {
    title: 'Criar conta',
    pageTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    switchPrompt: 'Já tem uma conta?',
    switchLabel: 'Entre',
  },
}
