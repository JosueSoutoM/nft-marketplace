import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function AccountFormSkeleton({ title, fields }: { title: string; fields: number }) {
  return (
    <div aria-busy="true">
      <h1 className="text-display-sm text-foreground">{title}</h1>
      <output className="sr-only">Carregando…</output>
      <div className="mt-6 grid gap-x-7 gap-y-6 md:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex flex-col">
            <Skeleton className="mb-2 h-[1.375rem] w-40 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AccountLoadError({ title, message, retrying, onRetry }: { title: string; message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div>
      <h1 className="text-display-sm text-foreground">{title}</h1>
      <div role="alert" className="mt-6 flex flex-col items-start gap-4 rounded-sm border border-text-coral/60 bg-text-coral/10 p-5">
        <p className="text-body-sm text-foreground">{message}</p>
        <Button type="button" onClick={onRetry} disabled={retrying} className="rounded-sm font-bold">
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </div>
    </div>
  )
}
