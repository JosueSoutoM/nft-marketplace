import { useId, useState, type ComponentProps, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const inputClass =
  'h-[2.875rem] rounded-lg border-border bg-transparent px-4 text-body-sm text-foreground placeholder:text-secondary focus-visible:border-primary focus-visible:outline-none md:h-10 md:rounded-sm md:px-4 md:text-[length:0.8125rem]'

type AuthFieldProps = Omit<ComponentProps<'input'>, 'id' | 'ref' | 'onChange' | 'value'> & {
  label: string
  value: string
  error?: string
  describedBy?: string
  inputRef?: Ref<HTMLInputElement>
  onValueChange: (value: string) => void
}

export function AuthField({ label, value, error, describedBy, inputRef, onValueChange, className, ...props }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const descriptions = [error ? errorId : null, describedBy].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptions || undefined}
        className={cn(inputClass, error && 'border-text-coral')}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-caption text-text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

type PasswordFieldProps = Omit<AuthFieldProps, 'type'> & {
  toggleClassName?: string
}

export function PasswordField({ label, value, error, describedBy, inputRef, onValueChange, className, toggleClassName, ...props }: PasswordFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)
  const descriptions = [error ? errorId : null, describedBy].filter(Boolean).join(' ')
  const Icon = visible ? Eye : EyeOff

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions || undefined}
          className={cn(inputClass, 'pr-12', error && 'border-text-coral')}
          {...props}
        />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={`Mostrar ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
          className={cn(
            'absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-md text-secondary transition-colors hover:text-text-accent aria-pressed:text-text-accent',
            toggleClassName,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-caption text-text-coral">
          {error}
        </p>
      )}
    </div>
  )
}
