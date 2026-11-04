import { useEffect, useId, useRef, type FormEvent } from 'react'
import { WALLET_TYPES, type Network, type Wallet, type WalletSlot } from '@/api/contracts'
import { toApiError } from '@/api/errors'
import { FormErrorSummary, SubmitButton } from '@/components/auth/auth-parts'
import { useAuthForm } from '@/components/auth/use-auth-form'
import { SelectField, TextField } from '@/components/checkout/checkout-fields'
import { Button } from '@/components/ui/button'
import { useSaveWallet } from '@/hooks/use-wallets'
import { announce } from '@/lib/announcer'
import {
  WALLET_FIELD_LABELS as LABELS,
  toWalletDetails,
  validateWalletForm,
  walletTypeLabels,
  type WalletFormValues,
} from '@/lib/wallets'

const walletTypeOptions = WALLET_TYPES.map((type) => ({ value: type, label: walletTypeLabels[type] }))

type WalletFormProps = {
  slot: WalletSlot
  title: string
  initialValues: WalletFormValues
  networks: Network[]
  onSaved: (wallet: Wallet) => void
  onCancel?: () => void
}

export function WalletForm({ slot, title, initialValues, networks, onSaved, onCancel }: WalletFormProps) {
  const summaryId = useId()
  const form = useAuthForm(initialValues, LABELS)
  const save = useSaveWallet()
  const pending = save.isPending
  const network = form.values.network
  const firstRef = useRef<HTMLInputElement | null>(null)
  const focusOnMount = onCancel !== undefined

  useEffect(() => {
    if (focusOnMount) {
      firstRef.current?.focus()
    }
  }, [focusOnMount])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    const errors = validateWalletForm(form.values)
    if (Object.values(errors).some(Boolean)) {
      form.fail(errors)
      return
    }
    try {
      const wallet = await save.mutateAsync({ slot, body: { sameAsPrimary: false, ...toWalletDetails(form.values) } })
      announce(`${title} salva.`)
      onSaved(wallet)
    } catch (error) {
      const apiError = toApiError(error)
      form.failWithApiErrors(apiError.fieldErrors, apiError.message)
    }
  }

  const select = (field: 'network' | 'walletType') => {
    const { value, error, inputRef, onValueChange } = form.field(field)
    return { value, error, onValueChange, triggerRef: inputRef, label: LABELS[field], required: true, disabled: pending }
  }

  const text = (field: 'displayName' | 'nickname' | 'profileName' | 'referralCode' | 'email') => ({
    ...form.field(field),
    label: LABELS[field],
    required: true,
    readOnly: pending,
  })

  return (
    <form noValidate onSubmit={handleSubmit} aria-label={title} aria-describedby={summaryId} className="mt-6">
      <FormErrorSummary id={summaryId} summary={form.summary} />
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <TextField
          {...text('displayName')}
          inputRef={(element: HTMLInputElement | null) => {
            firstRef.current = element
            form.field('displayName').inputRef(element)
          }}
          autoComplete="name" maxLength={50} />
        <TextField {...text('nickname')} maxLength={40} />
        <SelectField
          {...select('network')}
          placeholder="Selecione uma rede"
          options={networks.map((entry) => ({ value: entry.id, label: entry.label }))}
        />
        <TextField {...text('profileName')} maxLength={50} />
        <TextField
          {...form.field('address')}
          label={LABELS.address}
          required
          readOnly={pending}
          placeholder={network === 'solana' ? 'Endereço Solana (base58) da carteira' : 'Endereço 0x da carteira'}
          hint={network ? undefined : 'Selecione a rede para validar o formato do endereço.'}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <TextField
          {...form.field('secondaryAddress')}
          label={`${LABELS.secondaryAddress} (opcional)`}
          hideLabel
          className="md:pt-[1.875rem]"
          readOnly={pending}
          placeholder="ENS ou carteira secundária (opcional)"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <SelectField
          {...select('walletType')}
          placeholder="Selecione uma carteira"
          options={walletTypeOptions}
        />
        <TextField
          {...text('referralCode')}
          maxLength={12}
          autoCapitalize="characters"
          onValueChange={(value) => form.field('referralCode').onValueChange(value.toUpperCase())}
        />
        <TextField {...text('email')} type="email" autoComplete="email" inputMode="email" />
        <TextField
          {...form.field('ensName')}
          label={LABELS.ensName}
          required
          readOnly={pending}
          suffix=".eth"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={67}
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} pendingLabel="Salvando…" className="w-full rounded-sm md:h-10 md:w-auto md:px-4">
          Salvar carteira
        </SubmitButton>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel} className="h-10 rounded-sm">
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
