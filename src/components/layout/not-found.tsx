import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Container } from './container'

export function NotFound() {
  return (
    <Container className="flex flex-col items-center py-20 text-center md:py-32">
      <p className="text-display-sm text-primary md:text-display" aria-hidden="true">
        404
      </p>
      <h1 className="mt-2 text-heading text-foreground">Página não encontrada</h1>
      <p className="mt-3 max-w-[28rem] text-body-sm text-muted-foreground">
        O endereço acessado não existe ou foi removido. Volte ao início para continuar explorando
        a coleção.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </Container>
  )
}
