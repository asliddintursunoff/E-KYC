import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md'
}

export function PageShell({ children, maxWidth = 'sm' }: PageShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-base px-5 py-10">
      <div className={`flex w-full flex-1 flex-col ${maxWidth === 'sm' ? 'max-w-sm' : 'max-w-md'}`}>
        {children}
      </div>
    </div>
  )
}
