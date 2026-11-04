import { useState } from 'react'
import type { EthAmount } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatEth, fromWei, toWei } from '@/lib/eth'

const WEI_PER_STEP = 10n ** 16n

function toSteps(value: EthAmount, round: 'floor' | 'ceil'): number {
  const wei = toWei(value)
  const steps = wei / WEI_PER_STEP
  return Number(round === 'ceil' && wei % WEI_PER_STEP !== 0n ? steps + 1n : steps)
}

function fromSteps(steps: number): EthAmount {
  return fromWei(BigInt(steps) * WEI_PER_STEP)
}

function formatLabel(steps: number): string {
  return formatEth(fromSteps(steps), { maximumFractionDigits: 2, unit: false }).replace('.', ',')
}

type PriceRangeFilterProps = {
  range: { min: EthAmount; max: EthAmount }
  priceMin?: EthAmount
  priceMax?: EthAmount
  onApply: (priceMin: EthAmount | undefined, priceMax: EthAmount | undefined) => void
}

export function PriceRangeFilter({ range, priceMin, priceMax, onApply }: PriceRangeFilterProps) {
  const bounds: [number, number] = [toSteps(range.min, 'floor'), toSteps(range.max, 'ceil')]
  const selected: [number, number] = [
    priceMin === undefined ? bounds[0] : toSteps(priceMin, 'floor'),
    priceMax === undefined ? bounds[1] : toSteps(priceMax, 'ceil'),
  ]
  const selectedKey = selected.join('-')
  const [draft, setDraft] = useState({ key: selectedKey, value: selected })
  const value = draft.key === selectedKey ? draft.value : selected
  const disabled = bounds[0] >= bounds[1]

  function apply() {
    const [low, high] = value
    onApply(low <= bounds[0] ? undefined : fromSteps(low), high >= bounds[1] ? undefined : fromSteps(high))
  }

  return (
    <div>
      <Slider
        min={bounds[0]}
        max={Math.max(bounds[1], bounds[0] + 1)}
        step={1}
        minStepsBetweenThumbs={0}
        value={value}
        disabled={disabled}
        onValueChange={(next) => setDraft({ key: selectedKey, value: [next[0], next[1]] })}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        aria-label="Faixa de preço"
        className="mt-3"
      />
      <p className="mt-3 pl-4 text-body-sm text-foreground" aria-live="off">
        Preço: {formatLabel(value[0])} - {formatLabel(value[1])} ETH
      </p>
      <Button size="sm" className="mt-2.5 ml-4 h-7 px-3 text-body-sm font-bold" onClick={apply} disabled={disabled}>
        Aplicar
      </Button>
    </div>
  )
}
