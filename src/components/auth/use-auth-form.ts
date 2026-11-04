import { useEffect, useRef, useState } from 'react'
import type { FieldErrors } from '@/api/contracts'

export interface FormSummary {
  id: number
  message: string
  focusField: string
}

type Errors<F extends string> = Partial<Record<F, string>>

function listLabels(labels: string[]): string {
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}` : labels[0]
}

export function useAuthForm<F extends string>(initial: Record<F, string>, labels: Record<F, string>) {
  const order = Object.keys(initial) as F[]
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors<F>>({})
  const [summary, setSummary] = useState<FormSummary | null>(null)
  const inputs = useRef(new Map<F, HTMLInputElement>())
  const summaryCount = useRef(0)

  useEffect(() => {
    if (summary) {
      inputs.current.get(summary.focusField as F)?.focus()
    }
  }, [summary])

  function pickKnown(fieldErrors: FieldErrors): Errors<F> {
    return Object.fromEntries(order.filter((field) => fieldErrors[field]).map((field) => [field, fieldErrors[field]])) as Errors<F>
  }

  function fail(nextErrors: Errors<F>, message?: string) {
    const invalid = order.filter((field) => nextErrors[field])
    summaryCount.current += 1
    setErrors(nextErrors)
    setSummary({
      id: summaryCount.current,
      focusField: invalid[0] ?? order[0],
      message:
        message ??
        (invalid.length === 1
          ? `Revise o campo ${labels[invalid[0]]}.`
          : `Revise ${invalid.length} campos: ${listLabels(invalid.map((field) => labels[field]))}.`),
    })
  }

  function failWithApiErrors(fieldErrors: FieldErrors, message: string) {
    fail(pickKnown(fieldErrors), message)
  }

  function field(name: F) {
    return {
      value: values[name],
      error: errors[name],
      inputRef: (element: HTMLInputElement | null) => {
        if (element) {
          inputs.current.set(name, element)
        } else {
          inputs.current.delete(name)
        }
      },
      onValueChange: (value: string) => {
        setValues((current) => ({ ...current, [name]: value }))
        if (errors[name]) {
          setErrors((current) => ({ ...current, [name]: undefined }))
        }
      },
    }
  }

  return { values, field, fail, failWithApiErrors, summary }
}
