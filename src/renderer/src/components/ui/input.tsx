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
        <label
          htmlFor={id}
          className="text-xs font-medium text-[color:var(--app-interactive-fg-muted)]"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl border border-[color:var(--app-interactive-border)] bg-[color:var(--app-surface)] px-3 py-2.5 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)]',
          'hover:border-[color:var(--app-interactive-border-hover)]',
          'focus:outline-none focus:border-[color:var(--app-focus-ring)] focus:ring-1 focus:ring-[color:var(--app-primary-glow)]',
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
        <label
          htmlFor={id}
          className="text-xs font-medium text-[color:var(--app-interactive-fg-muted)]"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl border border-[color:var(--app-interactive-border)] bg-[color:var(--app-surface)] px-3 py-2.5 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)] resize-none',
          'hover:border-[color:var(--app-interactive-border-hover)]',
          'focus:outline-none focus:border-[color:var(--app-focus-ring)] focus:ring-1 focus:ring-[color:var(--app-primary-glow)]',
          'transition-colors duration-150 min-h-[80px]',
          className
        )}
        {...props}
      />
    </div>
  )
)
Textarea.displayName = 'Textarea'
