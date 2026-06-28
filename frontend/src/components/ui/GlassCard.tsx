import type { HTMLAttributes, ReactNode } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function GlassCard({ children, className = '', ...rest }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-4xl border border-white/10 bg-white/[0.04]
        p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  )
}
