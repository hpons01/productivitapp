import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:opacity-40 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-[color:var(--app-on-primary)] hover:bg-primary-500 shadow-md hover:shadow-lg hover:shadow-[color:var(--app-primary-glow)] hover:-translate-y-0.5 active:translate-y-0 font-semibold',
        secondary:
          'bg-surface-700/80 text-[color:var(--app-interactive-fg-default)] hover:bg-[color:var(--app-interactive-bg-hover)] border border-[color:var(--app-interactive-border)] hover:border-[color:var(--app-interactive-border-hover)]',
        ghost:
          'bg-transparent text-[color:var(--app-interactive-fg-muted)] hover:bg-[color:var(--app-interactive-bg-hover)] hover:text-[color:var(--app-interactive-fg-hover)]',
        danger:
          'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/25 hover:border-red-500/50',
        success:
          'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/50',
        amber:
          'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/50 font-semibold'
      },
      size: {
        sm:   'h-8 px-3 text-xs',
        md:   'h-9 px-4 text-sm',
        lg:   'h-11 px-6 text-sm',
        icon: 'h-9 w-9 p-0'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
