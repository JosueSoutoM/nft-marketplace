import { useState } from 'react'
import { Search } from 'lucide-react'
import { CatalogSearchField } from '@/components/catalog/catalog-search-field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type HeaderSearchProps = {
  className: string
}

export function HeaderSearch({ className }: HeaderSearchProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Buscar NFTs" className={className}>
        <Search className="size-6" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-3">
        <CatalogSearchField
          id="header-search"
          label="Buscar NFTs por nome, criador ou coleção"
          placeholder="Explorar coleções"
          inputClassName="bg-ink"
          onSubmitted={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
