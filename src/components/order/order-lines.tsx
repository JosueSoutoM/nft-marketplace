import type { OrderReceipt } from '@/api/contracts'
import { NftImage } from '@/components/nft/nft-image'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

const columnsClass = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_6rem_7.5rem]'

export function OrderLines({ receipt, title }: { receipt: OrderReceipt; title: string }) {
  return (
    <section aria-labelledby="order-lines-title">
      <h2 id="order-lines-title" className="text-body font-bold text-foreground">
        {title}
      </h2>
      <div aria-hidden="true" className={cn(columnsClass, 'mt-2 border-b border-border-soft pb-2 text-body font-bold text-foreground')}>
        <span>NFTs</span>
        <span className="text-center max-sm:hidden">Edições</span>
        <span className="text-right">Subtotal</span>
      </div>
      <ul aria-label="Itens do pedido" className="mt-4 flex flex-col gap-4">
        {receipt.lines.map((line) => (
          <li
            key={`${line.nftId}:${line.editionId}`}
            data-slot="order-line"
            aria-label={`${line.name}, edição ${line.editionLabel}`}
            className={columnsClass}
          >
            <div className="flex min-w-0 items-center gap-3">
              <NftImage
                image={line.image}
                alt=""
                sizes="70px"
                className="size-12 shrink-0 rounded-md object-cover sm:size-[4.375rem]"
              />
              <div className="min-w-0">
                <p className="truncate text-body-sm font-bold text-foreground sm:text-body">{line.name}</p>
                <p className="truncate text-body-sm leading-5 text-text-secondary">ID do token: #{line.tokenId}</p>
                <p aria-hidden="true" className="text-caption text-text-secondary sm:hidden">
                  (x {line.quantity}) · {line.editionLabel}
                </p>
              </div>
            </div>
            <p className="flex flex-col items-center text-body-sm text-text-secondary max-sm:sr-only">
              <span>
                <span aria-hidden="true">(x {line.quantity})</span>
                <span className="sr-only">{line.quantity === 1 ? '1 unidade' : `${line.quantity} unidades`}</span>
              </span>
              <span className="text-caption">
                <span className="sr-only">edição </span>
                {line.editionLabel}
              </span>
            </p>
            <p data-slot="order-line-total" className="text-right text-body-lg font-bold whitespace-nowrap text-text-accent tabular-nums">
              <span className="sr-only">Subtotal do item: </span>
              {formatEth(line.lineTotal)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function OrderTotals({ receipt }: { receipt: OrderReceipt }) {
  const discountLabel = receipt.couponCode ? `Desconto (cupom ${receipt.couponCode})` : 'Desconto'
  const rowClass = 'flex items-center justify-between gap-3 text-body text-foreground sm:pl-[12.75rem]'
  return (
    <dl className="mt-5 flex flex-col gap-1 border-b border-border-soft pb-3">
      <div className={rowClass}>
        <dt>Subtotal</dt>
        <dd data-slot="order-subtotal" className="text-body-lg tabular-nums">
          {formatEth(receipt.subtotal)}
        </dd>
      </div>
      <div className={rowClass}>
        <dt>{discountLabel}</dt>
        <dd data-slot="order-discount" className="text-body-lg tabular-nums">
          (-) {formatEth(receipt.discount)}
        </dd>
      </div>
      <div className={rowClass}>
        <dt>Taxa de rede</dt>
        <dd data-slot="order-fee" className="text-body-lg tabular-nums">
          {formatEth(receipt.networkFee)}
        </dd>
      </div>
      <div className={cn(rowClass, 'font-bold')}>
        <dt>Total</dt>
        <dd data-slot="order-total" className="text-[1.25rem] leading-8 text-text-accent tabular-nums">
          {formatEth(receipt.total)}
        </dd>
      </div>
    </dl>
  )
}
