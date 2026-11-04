import { useId, useRef, type ChangeEvent } from 'react'
import { ImageIcon } from 'lucide-react'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import type { AvatarDraft } from './use-avatar-draft'

type AvatarFieldProps = {
  currentUrl: string | null
  draft: AvatarDraft
  error?: string
  disabled: boolean
  buttonRef: (element: HTMLElement | null) => void
  onSelect: (file: File) => void
  onRemove: () => void
  onCancel: () => void
}

function draftHint(draft: AvatarDraft): string {
  if (draft.kind === 'upload') {
    return `Prévia de ${draft.file.name}. Clique em Salvar para aplicar.`
  }
  if (draft.kind === 'remove') {
    return 'O avatar será removido ao salvar.'
  }
  return `PNG, JPEG ou WebP até ${AVATAR_MAX_BYTES / 1024} KB.`
}

export function AvatarField({ currentUrl, draft, error, disabled, buttonRef, onSelect, onRemove, onCancel }: AvatarFieldProps) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrl = draft.kind === 'upload' ? draft.previewUrl : draft.kind === 'remove' ? null : currentUrl
  const canRemove = draft.kind === 'upload' || (draft.kind === 'keep' && currentUrl !== null)
  const descriptions = [error ? `${id}-error` : null, `${id}-hint`].filter(Boolean).join(' ')

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      onSelect(file)
    }
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-body text-foreground">Avatar</legend>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="flex size-[3.125rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-soft bg-surface-raised text-text-accent">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={draft.kind === 'upload' ? 'Prévia do novo avatar' : 'Avatar atual'}
              width={50}
              height={50}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6" strokeWidth={1.5} aria-label="Sem avatar" />
          )}
        </span>
        <Button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions}
          onClick={() => fileRef.current?.click()}
          className="h-10 rounded-sm px-6 font-bold"
        >
          Alterar
        </Button>
        {draft.kind === 'remove' ? (
          <button type="button" disabled={disabled} onClick={onCancel} className="text-body text-foreground hover:text-text-accent disabled:opacity-50">
            Desfazer
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || !canRemove}
            onClick={draft.kind === 'upload' ? onCancel : onRemove}
            className="text-body text-foreground hover:text-text-accent disabled:opacity-50"
          >
            {draft.kind === 'upload' ? 'Descartar' : 'Remover'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          tabIndex={-1}
          aria-hidden="true"
          data-testid="avatar-input"
          className="sr-only"
          onChange={handleChange}
        />
      </div>
      <p id={`${id}-hint`} className="mt-2 text-caption text-text-secondary">
        {draftHint(draft)}
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-caption text-text-coral">
          {error}
        </p>
      )}
    </fieldset>
  )
}
