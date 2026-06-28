import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <PageShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-[48px] font-bold text-ink-faint">404</h1>
        <p className="mt-2 text-[15px] text-ink-muted">This page doesn't exist.</p>
      </div>
      <div className="pb-4">
        <Button fullWidth onClick={() => navigate('/')}>
          Back to home
        </Button>
      </div>
    </PageShell>
  )
}
