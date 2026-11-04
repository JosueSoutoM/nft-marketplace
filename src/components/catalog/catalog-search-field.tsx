import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { NFT_SEARCH_MAX_LENGTH } from '@/api/contracts'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 350

type CatalogSearchFieldProps = {
  id: string
  label: string
  placeholder: string
  className?: string
  inputClassName?: string
  onSubmitted?: () => void
}

export function CatalogSearchField({
  id,
  label,
  placeholder,
  className,
  inputClassName,
  onSubmitted,
}: CatalogSearchFieldProps) {
  const navigate = useNavigate()
  const onHome = useRouterState({ select: (state) => state.location.pathname === '/' })
  const search = useSearch({ strict: false })
  const urlQuery = onHome ? (search.q ?? '') : ''
  const [value, setValue] = useState(urlQuery)
  const committedRef = useRef(urlQuery)
  const pushedInSessionRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (urlQuery !== committedRef.current) {
      committedRef.current = urlQuery
      setValue(urlQuery)
    }
  }, [urlQuery])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  function commit(text: string, { submitted }: { submitted: boolean }) {
    window.clearTimeout(timerRef.current)
    const q = text.trim().slice(0, NFT_SEARCH_MAX_LENGTH)
    if (onHome && q === committedRef.current && !submitted) {
      return
    }
    committedRef.current = q
    const replace = onHome && pushedInSessionRef.current
    pushedInSessionRef.current = true
    void navigate({
      to: '/',
      search: (previous) => ({ ...(onHome ? previous : {}), q, page: 1 }),
      hash: submitted ? CATALOG_HASH : undefined,
      replace,
      resetScroll: false,
    })
  }

  function handleChange(next: string) {
    setValue(next)
    if (!onHome) {
      return
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => commit(next, { submitted: false }), SEARCH_DEBOUNCE_MS)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commit(value, { submitted: true })
    document.getElementById(CATALOG_HASH)?.scrollIntoView({ block: 'start' })
    onSubmitted?.()
  }

  return (
    <search className={cn('block', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-secondary"
        />
        <input
          id={id}
          type="search"
          name="q"
          value={value}
          maxLength={NFT_SEARCH_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={placeholder}
          onFocus={() => {
            pushedInSessionRef.current = false
          }}
          onChange={(event) => handleChange(event.target.value)}
          className={cn(
            'h-11 w-full rounded-lg bg-surface-card pr-3 pl-11 text-body text-foreground placeholder:text-text-secondary [&::-webkit-search-cancel-button]:cursor-pointer',
            inputClassName,
          )}
        />
      </form>
    </search>
  )
}
