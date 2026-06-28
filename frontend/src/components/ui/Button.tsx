import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-base hover:bg-white active:scale-[0.98]',
  secondary:
    'bg-base-raised text-ink border border-base-border hover:border-ink-faint active:scale-[0.98]',
  ghost: 'bg-transparent text-ink-muted hover:text-ink',
  danger: 'bg-danger text-ink hover:bg-danger/90 active:scale-[0.98]',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center gap-2
        rounded-2xl px-6 py-3.5 text-[15px] font-semibold
        transition-all duration-150 ease-out
        disabled:cursor-not-allowed disabled:opacity-40
        ${fullWidth ? 'w-full' : ''}
        ${variantClasses[variant]}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
