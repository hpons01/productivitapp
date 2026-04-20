import { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-[family:var(--font-display)] font-semibold tracking-wider uppercase border',
  {
    variants: {
      variant: {
        default:   'bg-surface-600 text-[color:var(--app-muted)] border-surface-500/60',
        primary:   'bg-primary-600/20 text-primary-300 border-primary-500/30',
        success:   'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
        warning:   'bg-amber-950/60 text-amber-400 border-amber-800/40',
        danger:    'bg-red-950/60 text-red-400 border-red-800/40',
        common:    'bg-[rgba(138,155,168,0.08)] text-[#8a9ba8] border-[#8a9ba8]/40',
        uncommon:  'bg-[rgba(46,168,126,0.10)] text-[#2ea87e] border-[#2ea87e]/40',
        rare:      'bg-[rgba(74,159,212,0.10)] text-[#4a9fd4] border-[#4a9fd4]/40',
        epic:      'bg-[rgba(155,89,182,0.12)] text-[#9b59b6] border-[#9b59b6]/40',
        legendary: 'bg-[rgba(200,151,42,0.10)] text-[#c8972a] border-[#c8972a]/40 [animation:legendaryShimmer_3s_ease-in-out_infinite]'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
