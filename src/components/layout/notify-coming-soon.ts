import { toast } from 'sonner'

export function notifyComingSoon(feature: string) {
  toast(`${feature}: em breve`, {
    id: `coming-soon-${feature}`,
    description: 'Este recurso não faz parte desta versão do marketplace.',
  })
}
