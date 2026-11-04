import type { ComponentProps } from 'react'
import type { NftImage as NftImageData } from '@/api/contracts'

type NftImageProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'width' | 'height'> & {
  image: NftImageData
  sizes: string
}

export function NftImage({ image, alt, sizes, loading = 'lazy', ...props }: NftImageProps) {
  return (
    <img
      src={image.src}
      srcSet={image.sources.map((source) => `${source.src} ${source.width}w`).join(', ')}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={loading}
      decoding="async"
      {...props}
    />
  )
}
