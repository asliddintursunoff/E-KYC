import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-muted">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`
            rounded-xl border border-base-border bg-base-surface px-4 py-3
            text-[15px] text-ink placeholder:text-ink-faint
            outline-none transition-colors duration-150
            focus:border-accent focus:ring-1 focus:ring-accent/40
            ${error ? 'border-danger focus:border-danger focus:ring-danger/40' : ''}
            ${className}
          `}
          {...rest}
        />
        {error && <span className="text-[13px] text-danger">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
