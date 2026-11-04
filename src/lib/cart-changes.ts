import type { CartItem, EthAmount } from '@/api/contracts'
import { compareEth, formatEth } from './eth'

export interface CartItemSnapshot {
  unitPrice: EthAmount
  available: number
}

function units(count: number): string {
  return count === 1 ? '1 unidade' : `${count} unidades`
}

export function describeCartItemChange(before: CartItemSnapshot, after: CartItemSnapshot): string | null {
  const parts: string[] = []
  if (compareEth(before.unitPrice, after.unitPrice) !== 0) {
    parts.push(`Preço alterado de ${formatEth(before.unitPrice)} para ${formatEth(after.unitPrice)}.`)
  }
  if (after.available !== before.available) {
    if (after.available === 0) {
      parts.push('Edição esgotada.')
    } else if (after.available < before.available) {
      parts.push(`Disponibilidade reduzida: ${after.available === 1 ? 'resta' : 'restam'} ${units(after.available)}.`)
    } else {
      parts.push(`Disponibilidade atualizada: ${units(after.available)}.`)
    }
  }
  return parts.length > 0 ? parts.join(' ') : null
}

export function cartItemLimitReason(item: Pick<CartItem, 'available' | 'maxQuantity'>): string {
  if (item.maxQuantity === 0) {
    return 'Esta edição está esgotada.'
  }
  if (item.maxQuantity === item.available) {
    return item.available === 1 ? 'Só resta 1 unidade desta edição.' : `Só restam ${item.available} unidades desta edição.`
  }
  return `Limite de ${units(item.maxQuantity)} por pedido nesta edição.`
}

export function cartItemBlockingIssue(item: Pick<CartItem, 'quantity' | 'available' | 'maxQuantity'>): string | null {
  if (item.available === 0) {
    return 'Edição esgotada. Remova o item para continuar.'
  }
  if (item.quantity > item.maxQuantity) {
    return `Quantidade acima do disponível. Ajuste para no máximo ${item.maxQuantity} para continuar.`
  }
  return null
}

export function describeUnits(count: number): string {
  return units(count)
}

export function describeItems(count: number): string {
  return count === 1 ? '1 item' : `${count} itens`
}

export function cartLinkLabel(count: number): string {
  return count === 0 ? 'Carrinho' : `Carrinho, ${describeItems(count)}`
}
