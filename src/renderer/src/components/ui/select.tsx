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
        <label htmlFor={id} className="text-xs font-medium text-surface-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            'w-full appearance-none rounded-xl bg-surface-800 border border-surface-500 px-3 py-2.5 pr-8 text-sm text-white',
            'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30',
            'transition-colors duration-150 cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
        />
      </div>
    </div>
  )
)
Select.displayName = 'Select'
