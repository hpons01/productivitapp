import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-500 shadow-lg hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'bg-surface-700 text-white hover:bg-surface-600 border border-surface-500',
        ghost:
          'bg-transparent text-surface-300 hover:bg-surface-700 hover:text-white',
        danger:
          'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30',
        success:
          'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30',
        amber:
          'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 font-bold'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
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
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
