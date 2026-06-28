import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { extractErrorMessage } from '@/services/apiClient'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const setTemporaryLoginToken = useAuthStore((s) => s.setTemporaryLoginToken)

  const [passportId, setPassportId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await authService.login({ passport_id: passportId, password })
      setTemporaryLoginToken(response.temporary_login_token)
      navigate('/verify')
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid passport ID or password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <TopBar title="Log in" />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Input
          label="Passport ID"
          name="passport_id"
          value={passportId}
          onChange={(e) => setPassportId(e.target.value)}
          autoComplete="username"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>
        )}

        <div className="mt-2 pb-4">
          <Button type="submit" fullWidth loading={submitting}>
            Continue
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
