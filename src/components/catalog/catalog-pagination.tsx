import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CatalogPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

type PageItem = number | 'gap-start' | 'gap-end'

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  const start = Math.max(2, Math.min(page - 1, totalPages - 3))
  const end = Math.min(totalPages - 1, Math.max(page + 1, 4))
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index)
  return [
    1,
    ...(start > 2 ? (['gap-start'] as const) : []),
    ...middle,
    ...(end < totalPages - 1 ? (['gap-end'] as const) : []),
    totalPages,
  ]
}

const itemClass =
  'flex size-[2.1875rem] items-center justify-center rounded-sm border border-border text-body text-foreground transition-colors hover:border-primary'

export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex flex-wrap gap-2">
        {page > 1 && (
          <li>
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => onPageChange(page - 1)}
              className={itemClass}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
        {buildPageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  itemClass,
                  item === page && 'border-primary bg-primary font-bold text-primary-foreground',
                )}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" className="flex size-[2.1875rem] items-center justify-center text-foreground">
              …
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <button
              type="button"
              aria-label="Próxima página"
              onClick={() => onPageChange(page + 1)}
              className={itemClass}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
