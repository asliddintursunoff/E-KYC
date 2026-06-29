import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

export function PageShell({ children, maxWidth = 'sm' }: PageShellProps) {
  let maxClass = 'max-w-sm'
  if (maxWidth === 'md') maxClass = 'max-w-md'
  if (maxWidth === 'lg') maxClass = 'max-w-3xl'

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-base px-5 py-10">
      <div className={`flex w-full flex-1 flex-col ${maxClass}`}>
        {children}
      </div>
    </div>
  )
}
