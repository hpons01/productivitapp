import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, id, children, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-[color:var(--app-interactive-fg-muted)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full appearance-none rounded-xl border border-[color:var(--app-interactive-border)] bg-[color:var(--app-surface)] px-3 py-2.5 pr-8 text-sm text-[color:var(--app-interactive-fg-default)]',
            'hover:border-[color:var(--app-interactive-border-hover)]',
            'focus:outline-none focus:border-[color:var(--app-focus-ring)] focus:ring-1 focus:ring-[color:var(--app-primary-glow)]',
            'transition-colors duration-150 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 ui-icon-default pointer-events-none"
        />
      </div>
    </div>
  )
)
Select.displayName = 'Select'
