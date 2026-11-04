import { useEffect, useRef } from 'react'
import type { Nft, NftEdition } from '@/api/contracts'
import { announce } from '@/lib/announcer'
import { compareEth, formatEth } from '@/lib/eth'
import { maxQuantity } from '@/lib/nft-edition'

interface Snapshot {
  version: number
  editionId: string
  price: string
  available: number
}

function describeChanges(name: string, before: Snapshot, edition: NftEdition): string[] {
  const messages: string[] = []
  if (compareEth(before.price, edition.price) !== 0) {
    messages.push(
      `O preço de ${name} na edição ${edition.label} mudou de ${formatEth(before.price)} para ${formatEth(edition.price)}.`,
    )
  }
  if (before.available !== edition.available) {
    messages.push(
      edition.available === 0
        ? `A edição ${edition.label} esgotou.`
        : `Disponibilidade atualizada: ${edition.available} de ${edition.supply} na edição ${edition.label}.`,
    )
  }
  return messages
}

export function useEditionChangeFeedback(
  nft: Nft,
  edition: NftEdition,
  quantity: number,
  onQuantityChange: (quantity: number) => void,
) {
  const previous = useRef<Snapshot>({
    version: nft.version,
    editionId: edition.id,
    price: edition.price,
    available: edition.available,
  })

  useEffect(() => {
    const before = previous.current
    previous.current = { version: nft.version, editionId: edition.id, price: edition.price, available: edition.available }
    if (before.version === nft.version || before.editionId !== edition.id) {
      return
    }
    const messages = describeChanges(nft.name, before, edition)
    const max = maxQuantity(edition)
    if (max > 0 && quantity > max) {
      onQuantityChange(max)
      messages.push(`A quantidade foi ajustada para ${max}.`)
    }
    if (messages.length > 0) {
      announce(messages.join(' '))
    }
  }, [nft.version, nft.name, edition, quantity, onQuantityChange])
}
