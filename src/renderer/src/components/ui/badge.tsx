import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold border',
  {
    variants: {
      variant: {
        default: 'bg-surface-600 text-surface-200 border-surface-500',
        primary: 'bg-primary-600/20 text-primary-300 border-primary-500/30',
        success: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        danger: 'bg-red-600/20 text-red-400 border-red-500/30',
        common: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
        uncommon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        rare: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        epic: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        legendary: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
