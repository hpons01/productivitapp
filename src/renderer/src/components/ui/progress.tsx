import { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'primary' | 'xp' | 'hp' | 'amber'
  size?: 'sm' | 'md' | 'lg'
}

const trackColors = {
  primary: 'bg-surface-600',
  xp: 'bg-surface-600',
  hp: 'bg-surface-600',
  amber: 'bg-surface-600'
}

const fillColors = {
  primary: 'bg-primary-600',
  xp: 'xp-bar',
  hp: 'bg-red-500',
  amber: 'bg-amber-500'
}

const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' }

export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={cn('w-full rounded-full overflow-hidden', trackColors[variant], heights[size], className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', fillColors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
