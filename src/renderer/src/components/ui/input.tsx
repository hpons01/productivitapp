import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-surface-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl bg-surface-800 border border-surface-500 px-3 py-2.5 text-sm text-white placeholder:text-surface-400',
          'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30',
          'transition-colors duration-150',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-surface-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl bg-surface-800 border border-surface-500 px-3 py-2.5 text-sm text-white placeholder:text-surface-400 resize-none',
          'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30',
          'transition-colors duration-150 min-h-[80px]',
          className
        )}
        {...props}
      />
    </div>
  )
)
Textarea.displayName = 'Textarea'
