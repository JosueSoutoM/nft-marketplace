import { useId, type ComponentProps, type ReactNode, type Ref } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const fieldControlClass =
  'h-10 w-full rounded-sm border border-border bg-transparent px-4 text-body-sm text-foreground placeholder:text-secondary focus-visible:border-primary focus-visible:outline-none read-only:text-text-secondary'

type FieldShellProps = {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

function FieldShell({ id, label, required, error, hint, hideLabel, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <label htmlFor={id} className={cn('mb-2 text-body text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-text-coral">
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-caption text-text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  return [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
}

type TextFieldProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'ref'> & {
  label: string
  value: string
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  suffix?: string
  inputRef?: Ref<HTMLInputElement>
  onValueChange?: (value: string) => void
}

export function TextField({ label, value, error, hint, hideLabel, suffix, inputRef, onValueChange, className, required, ...props }: TextFieldProps) {
  const id = useId()
  const input = (
    <Input
      id={id}
      ref={inputRef}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      aria-required={required || undefined}
      className={cn(fieldControlClass, suffix && 'rounded-r-none', error && 'border-text-coral')}
      {...props}
    />
  )

  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} hideLabel={hideLabel} className={className}>
      {suffix ? (
        <div className="flex">
          {input}
          <span
            aria-hidden="true"
            className="flex h-10 shrink-0 items-center rounded-r-sm border border-l-0 border-border px-3 text-body text-foreground"
          >
            {suffix}
          </span>
        </div>
      ) : (
        input
      )}
    </FieldShell>
  )
}

type TextAreaFieldProps = Omit<ComponentProps<'textarea'>, 'id' | 'value' | 'onChange' | 'ref'> & {
  label: string
  value: string
  error?: string
  textareaRef?: Ref<HTMLTextAreaElement>
  onValueChange: (value: string) => void
}

export function TextAreaField({ label, value, error, textareaRef, onValueChange, className, ...props }: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} className={className}>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={cn(fieldControlClass, 'h-[9.4375rem] resize-none py-3', error && 'border-text-coral')}
        {...props}
      />
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

type SelectFieldProps = {
  label: string
  value: string
  options: SelectOption[]
  placeholder: string
  error?: string
  hint?: ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
  triggerRef?: Ref<HTMLButtonElement>
  onValueChange: (value: string) => void
}

export function SelectField({ label, value, options, placeholder, error, hint, required, disabled, className, triggerRef, onValueChange }: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          ref={triggerRef}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          aria-required={required || undefined}
          className={cn(
            fieldControlClass,
            'w-full data-placeholder:text-secondary disabled:opacity-100 disabled:text-text-secondary',
            error && 'border-text-coral',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
