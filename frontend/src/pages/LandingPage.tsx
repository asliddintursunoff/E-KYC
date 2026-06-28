import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { FaceMark } from '@/components/ui/FaceMark'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <PageShell>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 text-ink">
          <FaceMark size={48} />
        </div>

        <h1 className="text-[28px] font-bold tracking-tight text-ink">Face ID</h1>
        <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-ink-muted">
          Verify your identity in seconds. Secure, fast, and private biometric
          authentication.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <Button fullWidth onClick={() => navigate('/register')}>
          Create account
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/login')}>
          Log in
        </Button>
      </div>
    </PageShell>
  )
}
