import type { NetworkId, Quote, QuoteChange, QuoteLine } from '@/api/contracts'
import { compareEth, formatEth } from './eth'

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function formatQuoteExpiry(quote: Quote): string {
  return timeFormat.format(new Date(quote.expiresAt))
}

function isBlocking(line: QuoteLine | undefined): boolean {
  return line?.issue === 'SOLD_OUT' || line?.issue === 'INSUFFICIENT_AVAILABILITY'
}

function itemsKey(quote: Quote): string {
  return quote.lines
    .map((line) => `${line.cartItemId}:${line.quantity}`)
    .sort()
    .join('|')
}

function couponOf(quote: Quote): string | null {
  return quote.coupon?.code ?? quote.couponError?.code ?? null
}

export function diffQuotes(previous: Quote, next: Quote): QuoteChange[] {
  const changes: QuoteChange[] = []
  if (previous.network !== next.network) {
    changes.push({ type: 'NETWORK_CHANGED', previous: previous.network, current: next.network })
  }
  if (itemsKey(previous) !== itemsKey(next)) {
    changes.push({ type: 'ITEMS_CHANGED' })
  }
  for (const line of next.lines) {
    const before = previous.lines.find((entry) => entry.cartItemId === line.cartItemId)
    if (before && compareEth(before.unitPrice, line.unitPrice) !== 0) {
      changes.push({ type: 'PRICE_CHANGED', nftId: line.nftId, editionId: line.editionId, previous: before.unitPrice, current: line.unitPrice })
    }
    if (isBlocking(line) && (!isBlocking(before) || before?.available !== line.available)) {
      changes.push({ type: 'AVAILABILITY_CHANGED', nftId: line.nftId, editionId: line.editionId, requested: line.quantity, available: line.available })
    }
  }
  if (couponOf(previous) !== couponOf(next) || (previous.couponError?.reason ?? null) !== (next.couponError?.reason ?? null)) {
    changes.push({ type: 'COUPON_CHANGED', previous: couponOf(previous), current: couponOf(next), reason: next.couponError?.reason ?? null })
  }
  if (compareEth(previous.networkFee, next.networkFee) !== 0) {
    changes.push({ type: 'NETWORK_FEE_CHANGED', previous: previous.networkFee, current: next.networkFee })
  }
  return changes
}

function lineLabel(quotes: Quote[], nftId: string, editionId: string): string {
  const line = quotes.flatMap((quote) => quote.lines).find((entry) => entry.nftId === nftId && entry.editionId === editionId)
  return line ? `${line.name} (edição ${line.editionLabel})` : 'Um item do carrinho'
}

function units(count: number): string {
  return count === 1 ? '1 unidade' : `${count} unidades`
}

function describeChange(change: QuoteChange, quotes: Quote[], networkLabel: (id: NetworkId) => string): string | null {
  switch (change.type) {
    case 'QUOTE_EXPIRED':
      return 'A cotação anterior expirou.'
    case 'QUOTE_VERSION_MISMATCH':
      return null
    case 'ITEMS_CHANGED':
      return 'Os itens ou as quantidades do carrinho mudaram.'
    case 'NETWORK_CHANGED':
      return `Rede: de ${networkLabel(change.previous)} para ${networkLabel(change.current)}.`
    case 'PRICE_CHANGED':
      return `${lineLabel(quotes, change.nftId, change.editionId)}: preço de ${formatEth(change.previous)} para ${formatEth(change.current)}.`
    case 'AVAILABILITY_CHANGED':
      return change.available === 0
        ? `${lineLabel(quotes, change.nftId, change.editionId)}: a edição esgotou.`
        : `${lineLabel(quotes, change.nftId, change.editionId)}: disponibilidade de ${units(change.requested)} para ${units(change.available)}.`
    case 'COUPON_CHANGED':
      return `Cupom: de ${change.previous ?? 'nenhum'} para ${change.current && !change.reason ? change.current : 'nenhum'}.`
    case 'NETWORK_FEE_CHANGED':
      return `Taxa de rede: de ${formatEth(change.previous)} para ${formatEth(change.current)}.`
  }
}

export function describeQuoteChanges(
  changes: QuoteChange[],
  previous: Quote,
  next: Quote,
  networkLabel: (id: NetworkId) => string,
): string[] {
  const messages = changes.flatMap((change) => describeChange(change, [next, previous], networkLabel) ?? [])
  if (compareEth(previous.total, next.total) !== 0) {
    messages.push(`Total: de ${formatEth(previous.total)} para ${formatEth(next.total)}.`)
  }
  if (messages.length === 0) {
    messages.push('A cotação foi atualizada.')
  }
  return [...new Set(messages)]
}
