import { useState } from 'react'
import { Search } from 'lucide-react'
import type { NftImage as NftImageData } from '@/api/contracts'
import { NftImage } from '@/components/nft/nft-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { galleryClass, mainImageClass, mainPanelClass, thumbButtonClass, thumbListClass } from './layout'

type NftGalleryProps = {
  name: string
  images: NftImageData[]
}

export function NftGallery({ name, images }: NftGalleryProps) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <div className={galleryClass}>
      {images.length > 1 && (
        <ul aria-label="Imagens do NFT" className={thumbListClass}>
          {images.map((image, index) => {
            const active = index === selected
            return (
              <li key={`${image.src}-${index}`}>
                <button
                  type="button"
                  aria-label={`Mostrar imagem ${index + 1} de ${images.length}`}
                  aria-pressed={active}
                  onClick={() => setSelected(index)}
                  className={cn(
                    thumbButtonClass,
                    active ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <NftImage image={image} alt="" sizes="100px" className="size-full rounded-md object-cover" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className={mainPanelClass}>
        <NftImage
          image={current}
          sizes="(min-width: 1024px) 405px, (min-width: 768px) 444px, 100vw"
          loading="eager"
          fetchPriority="high"
          className={mainImageClass}
        />
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar imagem"
            className="absolute top-3 right-3 hidden size-10 items-center justify-center rounded-full bg-ink/85 text-foreground transition-colors hover:text-text-accent md:flex"
          >
            <Search className="size-5" aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="max-w-[min(48rem,calc(100%-2rem))] p-3 sm:max-w-[min(48rem,calc(100%-2rem))]">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <DialogDescription className="sr-only">{current.alt}</DialogDescription>
            <NftImage
              image={current}
              sizes="(min-width: 800px) 768px, 100vw"
              loading="eager"
              className="aspect-square w-full rounded-lg object-cover"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
