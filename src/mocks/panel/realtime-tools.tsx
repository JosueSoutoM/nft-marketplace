import { useId, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRealtimeStatus } from '@/realtime/use-realtime-status'
import type { RealtimeStatus } from '@/realtime/client'
import {
  dropRealtimeConnections,
  getRealtimeServerStatus,
  refuseRealtimeConnections,
  replayLastRealtimeEvent,
  sendStaleRealtimeEvent,
  subscribeRealtimeServerStatus,
} from '../socket/server'

const CLIENT_STATUS_LABELS: Record<RealtimeStatus, string> = {
  idle: 'Inativo',
  connecting: 'Conectando',
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  disconnected: 'Desconectado',
}

interface RealtimeToolsProps {
  onStatus: (message: string) => void
}

export function RealtimeTools({ onStatus }: RealtimeToolsProps) {
  const server = useSyncExternalStore(subscribeRealtimeServerStatus, getRealtimeServerStatus)
  const clientStatus = useRealtimeStatus()
  const [refuseSeconds, setRefuseSeconds] = useState('10')
  const secondsId = useId()
  const headingId = useId()
  const identities = server.connections.map((connection) => connection.userId ?? 'visitante').join(', ')

  function handleDrop() {
    const count = dropRealtimeConnections()
    onStatus(count > 0 ? `${count} conexão(ões) derrubada(s) pelo servidor.` : 'Nenhuma conexão ativa para derrubar.')
  }

  function handleRefuse() {
    const seconds = Number(refuseSeconds)
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) {
      onStatus('Informe um número inteiro de segundos entre 1 e 300.')
      return
    }
    refuseRealtimeConnections(seconds)
    onStatus(`Conexões recusadas por ${seconds} s.`)
  }

  function handleReplay() {
    const event = replayLastRealtimeEvent()
    onStatus(event ? `Evento ${event.type} v${event.version} reenviado (mesmo id).` : 'Nenhum evento para reenviar.')
  }

  function handleStale() {
    const event = sendStaleRealtimeEvent()
    onStatus(event ? `Evento antigo ${event.type} v${event.version} enviado.` : 'Não foi possível montar um evento antigo.')
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-t border-border-soft pt-3">
      <h3 id={headingId} className="text-body-sm font-bold text-foreground">
        Tempo real
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-caption text-text-secondary">
        <dt>Cliente</dt>
        <dd className="text-foreground">{CLIENT_STATUS_LABELS[clientStatus]}</dd>
        <dt>Servidor</dt>
        <dd className="text-foreground">
          {server.connections.length === 0 ? 'Sem conexões' : `${server.connections.length} conexão(ões): ${identities}`}
        </dd>
        <dt>Último evento</dt>
        <dd className="text-foreground">
          {server.lastEvent ? `${server.lastEvent.type} ${server.lastEvent.resourceId} v${server.lastEvent.version}` : 'Nenhum'}
        </dd>
        {server.refusingUntil && (
          <>
            <dt>Reconexão</dt>
            <dd className="text-foreground">Recusada até {new Date(server.refusingUntil).toLocaleTimeString('pt-BR')}</dd>
          </>
        )}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDrop}>
          Derrubar conexão
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleReplay} disabled={!server.lastEvent}>
          Reenviar último evento
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleStale}>
          Enviar evento antigo
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={secondsId}>Segundos sem reconexão</Label>
        <div className="flex gap-2">
          <Input
            id={secondsId}
            type="number"
            inputMode="numeric"
            min={1}
            max={300}
            value={refuseSeconds}
            onChange={(event) => setRefuseSeconds(event.target.value)}
            className="h-9 w-20"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleRefuse}>
            Recusar reconexões
          </Button>
        </div>
      </div>
    </section>
  )
}
