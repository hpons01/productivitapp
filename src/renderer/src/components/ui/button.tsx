import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm font-[family:var(--font-display)] font-semibold tracking-wide uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:opacity-40 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-teal-700 text-white border border-teal-600 hover:bg-teal-600 hover:border-teal-500 shadow-[0_2px_0_rgba(0,0,0,0.5)] hover:shadow-[0_1px_0_rgba(0,0,0,0.5),0_0_12px_rgba(13,148,136,0.3)] active:translate-y-px active:shadow-none',
        secondary:
          'bg-surface-600/80 text-[color:var(--app-text)] border border-surface-500/60 hover:bg-surface-500/80 hover:border-surface-400/60 shadow-[var(--shadow-inset)]',
        ghost:
          'bg-transparent text-[color:var(--app-muted)] border border-transparent hover:text-[color:var(--app-text)] hover:bg-surface-600/50',
        danger:
          'bg-red-950/60 text-red-400 border border-red-800/40 hover:bg-red-900/60 hover:border-red-700/50 hover:text-red-300 shadow-[inset_0_1px_0_rgba(255,80,80,0.08)]',
        success:
          'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60 hover:border-emerald-700/50 hover:text-emerald-300',
        amber:
          'bg-amber-950/60 text-amber-400 border border-amber-800/40 hover:bg-amber-900/60 hover:border-amber-700/50 hover:text-amber-300'
      },
      size: {
        sm:   'h-7 px-3 text-[10px]',
        md:   'h-9 px-4 text-[11px]',
        lg:   'h-11 px-6 text-[11px]',
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
