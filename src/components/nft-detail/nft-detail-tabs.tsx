import type { Nft } from '@/api/contracts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { tabsSectionClass } from './layout'
import { StarRating } from './star-rating'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' })

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const textClass = 'text-body-sm text-text-secondary'
const termClass = 'mt-4 text-body-sm font-bold text-foreground'

export function NftDetailTabs({ nft }: { nft: Nft }) {
  return (
    <Tabs defaultValue="details" className={tabsSectionClass}>
      <TabsList aria-label="Informações do NFT">
        <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
        <TabsTrigger value="reviews">
          Avaliações<span className="max-md:hidden"> de colecionadores</span> ({nft.rating.count})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-4">
        <div className="space-y-6">
          {nft.story.map((paragraph) => (
            <p key={paragraph} className={textClass}>
              {paragraph}
            </p>
          ))}
        </div>
        <dl>
          <dt className={termClass}>Rede:</dt>
          <dd className={textClass}>{nft.networkInfo}</dd>
          <dt className={termClass}>Contrato:</dt>
          <dd className={textClass}>
            <span title={nft.contract.address}>{shortAddress(nft.contract.address)}</span> · Contrato inteligente{' '}
            {nft.contract.standard} verificado.
          </dd>
          <dt className={termClass}>Direitos autorais:</dt>
          <dd className={textClass}>
            Direitos autorais do criador: {nft.contract.royaltyPercent}% nas vendas secundárias, pagos automaticamente
            pelos mercados compatíveis.
          </dd>
        </dl>
      </TabsContent>

      <TabsContent value="reviews" className="pt-4">
        {nft.reviews.length === 0 ? (
          <p className={textClass}>Este NFT ainda não recebeu avaliações.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {nft.reviews.map((review) => (
                <li key={review.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-body-sm font-bold text-foreground">{review.author}</p>
                    <StarRating value={review.rating} />
                    <time dateTime={review.createdAt} className="text-caption text-text-secondary">
                      {dateFormatter.format(new Date(review.createdAt))}
                    </time>
                  </div>
                  <p className={`mt-1 ${textClass}`}>{review.comment}</p>
                </li>
              ))}
            </ul>
            {nft.reviews.length < nft.rating.count && (
              <p className="mt-2 text-caption text-text-secondary">
                Mostrando as {nft.reviews.length} avaliações mais recentes de {nft.rating.count}.
              </p>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
