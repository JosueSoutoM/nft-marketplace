import { useEffect, useState } from 'react'

export type AvatarDraft = { kind: 'keep' } | { kind: 'upload'; file: File; previewUrl: string } | { kind: 'remove' }

const KEEP: AvatarDraft = { kind: 'keep' }

export function useAvatarDraft() {
  const [draft, setDraft] = useState<AvatarDraft>(KEEP)

  useEffect(() => {
    if (draft.kind !== 'upload') {
      return
    }
    return () => URL.revokeObjectURL(draft.previewUrl)
  }, [draft])

  return {
    draft,
    select: (file: File) => setDraft({ kind: 'upload', file, previewUrl: URL.createObjectURL(file) }),
    remove: () => setDraft({ kind: 'remove' }),
    reset: () => setDraft(KEEP),
  }
}
