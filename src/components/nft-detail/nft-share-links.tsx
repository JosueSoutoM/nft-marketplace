import { Mail } from 'lucide-react'
import { LinkedinIcon, TwitterIcon } from '@/components/icons/social-icons'

const linkClass = 'flex size-6 items-center justify-center rounded-sm text-foreground transition-colors hover:text-text-accent'

export function NftShareLinks({ name, url }: { name: string; url: string }) {
  const encodedUrl = encodeURIComponent(url)
  const text = encodeURIComponent(`${name} no Kurio`)

  return (
    <div className="flex items-center gap-2">
      <p className="text-[0.9375rem] leading-8 font-bold text-foreground">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1.5">
        <li>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no LinkedIn (abre em nova aba)"
            className={linkClass}
          >
            <LinkedinIcon className="size-4" />
          </a>
        </li>
        <li>
          <a href={`mailto:?subject=${text}&body=${encodedUrl}`} aria-label="Compartilhar por e-mail" className={linkClass}>
            <Mail className="size-4" aria-hidden="true" />
          </a>
        </li>
        <li>
          <a
            href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no Twitter (abre em nova aba)"
            className={linkClass}
          >
            <TwitterIcon className="size-4" />
          </a>
        </li>
      </ul>
    </div>
  )
}
