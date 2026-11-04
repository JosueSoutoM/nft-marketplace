import { useId, useState, type FormEvent } from 'react'
import type { Profile, UpdateProfileRequest } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { FormErrorSummary, SubmitButton } from '@/components/auth/auth-parts'
import { useAuthForm } from '@/components/auth/use-auth-form'
import { RevealablePasswordField, TextField } from '@/components/checkout/checkout-fields'
import { useChangePassword, useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from '@/hooks/use-profile'
import { announce } from '@/lib/announcer'
import { fullEnsName, stripEns } from '@/lib/checkout'
import {
  normalizeEmail,
  validateAvatarFile,
  validateEmail,
  validateEnsName,
  validateNewPassword,
  validatePasswordConfirmation,
  validateText,
  validateUsername,
} from '@/lib/validation'
import { AvatarField } from './avatar-field'
import { useAvatarDraft } from './use-avatar-draft'

const LABELS = {
  displayName: 'Nome de exibição',
  username: 'Nome de usuário',
  email: 'E-mail',
  ensName: 'Nome ENS',
  walletNickname: 'Apelido da carteira',
  avatar: 'Avatar',
  currentPassword: 'Senha atual',
  newPassword: 'Nova senha',
  newPasswordConfirmation: 'Confirmar nova senha',
}

type Field = keyof typeof LABELS
type Errors = Partial<Record<Field, string>>

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', newPasswordConfirmation: '' }

function profileValues(profile: Profile) {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: stripEns(profile.ensName),
    walletNickname: profile.walletNickname ?? '',
  }
}

function toRequest(values: Record<Field, string>): UpdateProfileRequest {
  return {
    displayName: values.displayName.trim(),
    username: values.username.trim(),
    email: normalizeEmail(values.email),
    ensName: fullEnsName(values.ensName),
    walletNickname: values.walletNickname.trim(),
  }
}

function isSameProfile(profile: Profile, request: UpdateProfileRequest): boolean {
  return (
    profile.displayName === request.displayName &&
    profile.username === request.username &&
    profile.email === request.email &&
    profile.ensName === request.ensName &&
    profile.walletNickname === request.walletNickname
  )
}

function validateProfile(request: UpdateProfileRequest): Errors {
  return {
    displayName: validateText(request.displayName, 'o nome de exibição', 2, 50) ?? undefined,
    username: validateUsername(request.username) ?? undefined,
    email: validateEmail(request.email) ?? undefined,
    ensName: validateEnsName(request.ensName ?? '') ?? undefined,
    walletNickname: validateText(request.walletNickname ?? '', 'o apelido da carteira', 2, 40) ?? undefined,
  }
}

function validatePasswords(values: Record<Field, string>): Errors {
  const newPassword =
    validateNewPassword(values.newPassword) ??
    (values.newPassword === values.currentPassword ? 'A nova senha deve ser diferente da atual.' : null)
  return {
    currentPassword: values.currentPassword ? undefined : 'Informe a senha atual.',
    newPassword: newPassword ?? undefined,
    newPasswordConfirmation: validatePasswordConfirmation(values.newPassword, values.newPasswordConfirmation) ?? undefined,
  }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const summaryId = useId()
  const statusId = useId()
  const form = useAuthForm({ ...profileValues(profile), avatar: '', ...EMPTY_PASSWORDS }, LABELS)
  const avatar = useAvatarDraft()
  const updateProfile = useUpdateProfile()
  const updateAvatar = useUpdateAvatar()
  const removeAvatar = useRemoveAvatar()
  const changePassword = useChangePassword()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ id: number; message: string } | null>(null)

  function showStatus(message: string) {
    setStatus((current) => ({ id: (current?.id ?? 0) + 1, message }))
    announce(message)
  }

  function selectAvatar(file: File) {
    const error = validateAvatarFile(file)
    if (error) {
      form.fail({ avatar: error })
      return
    }
    form.field('avatar').onValueChange('')
    avatar.select(file)
  }

  async function run<T>(task: () => Promise<T>): Promise<boolean> {
    try {
      await task()
      return true
    } catch (error) {
      const apiError = toApiError(error)
      form.failWithApiErrors(apiError.fieldErrors, apiError.message)
      return false
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) {
      return
    }
    const request = toRequest(form.values)
    const profileChanged = !isSameProfile(profile, request)
    const passwordTouched = [form.values.currentPassword, form.values.newPassword, form.values.newPasswordConfirmation].some(Boolean)
    const errors = { ...validateProfile(request), ...(passwordTouched ? validatePasswords(form.values) : {}) }
    if (Object.values(errors).some(Boolean)) {
      setStatus(null)
      form.fail(errors)
      return
    }
    if (!profileChanged && avatar.draft.kind === 'keep' && !passwordTouched) {
      form.clearSummary()
      showStatus('Nenhuma alteração para salvar.')
      return
    }

    setSaving(true)
    setStatus(null)
    form.clearSummary()
    const done: string[] = []
    let ok = true
    if (profileChanged) {
      ok = await run(async () => {
        const saved = await updateProfile.mutateAsync(request)
        form.setFieldValues(profileValues(saved))
      })
      if (ok) {
        done.push('Dados do perfil salvos.')
      }
    }
    const draft = avatar.draft
    if (ok && draft.kind !== 'keep') {
      ok = await run(() => (draft.kind === 'upload' ? updateAvatar.mutateAsync(draft.file) : removeAvatar.mutateAsync()))
      if (ok) {
        avatar.reset()
        done.push(draft.kind === 'upload' ? 'Avatar atualizado.' : 'Avatar removido.')
      }
    }
    if (ok && passwordTouched) {
      ok = await run(() =>
        changePassword.mutateAsync({
          currentPassword: form.values.currentPassword,
          newPassword: form.values.newPassword,
          newPasswordConfirmation: form.values.newPasswordConfirmation,
        }),
      )
      if (ok) {
        form.setFieldValues(EMPTY_PASSWORDS)
        done.push('Senha alterada.')
      }
    }
    setSaving(false)
    if (done.length > 0) {
      showStatus(done.join(' '))
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="profile-title" aria-describedby={`${summaryId} ${statusId}`}>
      <h1 id="profile-title" className="text-display-sm text-foreground">
        Perfil do colecionador
      </h1>
      <div className="mt-6">
        <FormErrorSummary id={summaryId} summary={form.summary} />
        <output id={statusId} className={status ? 'mb-3 block' : 'block'}>
          {status && (
            <p key={status.id} className="rounded-sm border border-success/60 bg-success/10 px-3 py-2 text-caption text-foreground">
              {status.message}
            </p>
          )}
        </output>
      </div>

      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <TextField {...form.field('displayName')} label={LABELS.displayName} required autoComplete="name" maxLength={50} readOnly={saving} />
        <TextField
          {...form.field('username')}
          label={LABELS.username}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          readOnly={saving}
        />
        <TextField {...form.field('email')} label={LABELS.email} required type="email" autoComplete="email" inputMode="email" readOnly={saving} />
        <TextField
          {...form.field('ensName')}
          label={LABELS.ensName}
          required
          suffix=".eth"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={67}
          readOnly={saving}
        />
        <TextField {...form.field('walletNickname')} label={LABELS.walletNickname} required maxLength={40} readOnly={saving} />
        <AvatarField
          currentUrl={profile.avatarUrl}
          draft={avatar.draft}
          error={form.errors.avatar}
          disabled={saving}
          buttonRef={form.field('avatar').inputRef}
          onSelect={selectAvatar}
          onRemove={avatar.remove}
          onCancel={avatar.reset}
        />
      </div>

      <fieldset className="mt-10 md:max-w-[calc(50%-0.875rem)]">
        <legend className="text-display-sm text-foreground">Alterar senha</legend>
        <p className="mt-1 text-caption text-text-secondary">
          Preencha apenas se quiser trocar a senha. A nova senha precisa ter pelo menos 8 caracteres, com letras e números.
        </p>
        <div className="mt-5 flex flex-col gap-6">
          <RevealablePasswordField {...form.field('currentPassword')} label={LABELS.currentPassword} autoComplete="current-password" readOnly={saving} />
          <RevealablePasswordField {...form.field('newPassword')} label={LABELS.newPassword} autoComplete="new-password" readOnly={saving} />
          <RevealablePasswordField
            {...form.field('newPasswordConfirmation')}
            label={LABELS.newPasswordConfirmation}
            autoComplete="new-password"
            readOnly={saving}
          />
        </div>
      </fieldset>

      <SubmitButton pending={saving} pendingLabel="Salvando…" className="mt-10 w-full rounded-sm md:h-10 md:w-[8.125rem]">
        Salvar
      </SubmitButton>
    </form>
  )
}
