import { ORDER_NOTE_MAX_LENGTH, WALLET_TYPES, type Network, type NetworkId, type Wallet, type WalletType } from '@/api/contracts'
import {
  CHECKOUT_FIELD_LABELS as LABELS,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutValues,
  type WalletChoice,
} from '@/lib/checkout'
import { walletTypeLabels } from '@/lib/wallets'
import { SelectField, TextAreaField, TextField } from './checkout-fields'

type FieldRef = (field: CheckoutField) => (element: HTMLElement | null) => void

type CollectorFormProps = {
  values: CheckoutValues
  errors: CheckoutErrors
  wallet: WalletChoice | null
  savedWallet: Wallet | undefined
  network: NetworkId | null
  networks: Network[]
  disabled: boolean
  fieldRef: FieldRef
  onValueChange: <K extends keyof CheckoutValues>(field: K, value: CheckoutValues[K]) => void
  onNetworkChange: (network: NetworkId) => void
  onUseOtherWallet: (useOther: boolean) => void
}

const walletTypeOptions = WALLET_TYPES.map((type) => ({ value: type, label: walletTypeLabels[type] }))

export function CollectorForm({
  values,
  errors,
  wallet,
  savedWallet,
  network,
  networks,
  disabled,
  fieldRef,
  onValueChange,
  onNetworkChange,
  onUseOtherWallet,
}: CollectorFormProps) {
  const other = wallet?.source === 'other'
  const text = (field: CheckoutField & keyof CheckoutValues) => ({
    label: LABELS[field],
    value: values[field] as string,
    error: errors[field],
    inputRef: fieldRef(field),
    readOnly: disabled,
    onValueChange: (value: string) => onValueChange(field, value),
  })

  return (
    <section aria-labelledby="collector-title" className="min-w-0">
      <h2 id="collector-title" className="text-body-lg font-bold text-foreground md:text-[1.1875rem] md:leading-7">
        Perfil do colecionador
      </h2>
      <div className="mt-4 grid gap-x-6 gap-y-5 md:grid-cols-2 md:gap-y-[1.0625rem]">
        <TextField {...text('displayName')} required autoComplete="name" maxLength={50} />
        <TextField {...text('username')} required autoComplete="username" maxLength={24} />
        <SelectField
          label={LABELS.network}
          value={network ?? ''}
          placeholder="Selecione uma rede"
          options={networks.map((entry) => ({ value: entry.id, label: entry.label }))}
          error={errors.network}
          required
          disabled={disabled}
          triggerRef={fieldRef('network')}
          onValueChange={(value) => onNetworkChange(value as NetworkId)}
        />
        <TextField {...text('profileName')} required maxLength={50} />
        <TextField
          label={LABELS.address}
          required
          value={other ? values.otherAddress : (savedWallet?.address ?? '')}
          placeholder="Endereço 0x da carteira"
          readOnly={!other || disabled}
          error={errors.address}
          inputRef={fieldRef('address')}
          autoComplete="off"
          spellCheck={false}
          onValueChange={(value) => onValueChange('otherAddress', value)}
        />
        <TextField
          label={`${LABELS.secondaryAddress} (opcional)`}
          hideLabel
          className="md:pt-[1.875rem]"
          value={other ? values.otherSecondaryAddress : (savedWallet?.secondaryAddress ?? '')}
          placeholder="ENS ou carteira secundária (opcional)"
          readOnly={!other || disabled}
          error={errors.secondaryAddress}
          inputRef={fieldRef('secondaryAddress')}
          autoComplete="off"
          spellCheck={false}
          onValueChange={(value) => onValueChange('otherSecondaryAddress', value)}
        />
        <SelectField
          label={LABELS.walletType}
          value={other ? values.otherWalletType : (savedWallet?.walletType ?? '')}
          placeholder="Selecione uma carteira"
          options={walletTypeOptions}
          error={errors.walletType}
          required
          disabled={!other || disabled}
          triggerRef={fieldRef('walletType')}
          onValueChange={(value) => onValueChange('otherWalletType', value as WalletType)}
        />
        <TextField
          {...text('referralCode')}
          required
          maxLength={12}
          autoCapitalize="characters"
          onValueChange={(value) => onValueChange('referralCode', value.toUpperCase())}
        />
        <TextField {...text('email')} required type="email" autoComplete="email" />
        <TextField {...text('ensName')} required suffix=".eth" autoComplete="off" spellCheck={false} maxLength={67} />
      </div>

      <label className="mt-6 inline-flex cursor-pointer items-center gap-2 text-body text-foreground">
        <input
          type="checkbox"
          checked={other}
          disabled={disabled}
          onChange={(event) => onUseOtherWallet(event.target.checked)}
          className="size-[1.125rem] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[0.3125rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        Usar outra carteira?
      </label>

      <TextAreaField
        label={`${LABELS.note} (opcional)`}
        value={values.note}
        error={errors.note}
        textareaRef={fieldRef('note')}
        readOnly={disabled}
        maxLength={ORDER_NOTE_MAX_LENGTH}
        onValueChange={(value) => onValueChange('note', value)}
        className="mt-6 md:max-w-[21.875rem]"
      />
    </section>
  )
}
