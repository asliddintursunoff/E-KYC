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
import type { RegisterPayload } from '@/types/api'

const initialForm: RegisterPayload = {
  first_name: '',
  last_name: '',
  middle_name: '',
  passport_id: '',
  password: '',
  date_of_birth: '',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const setSelfieVerificationToken = useAuthStore((s) => s.setSelfieVerificationToken)

  const [form, setForm] = useState<RegisterPayload>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof RegisterPayload) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await authService.register(form)
      setSelfieVerificationToken(response.selfie_verification_token)
      navigate('/register/face')
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed. Please check your details.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <TopBar title="Create account" />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
        <Input
          label="First name"
          name="first_name"
          value={form.first_name}
          onChange={update('first_name')}
          autoComplete="given-name"
          required
        />
        <Input
          label="Last name"
          name="last_name"
          value={form.last_name}
          onChange={update('last_name')}
          autoComplete="family-name"
          required
        />
        <Input
          label="Middle name"
          name="middle_name"
          value={form.middle_name}
          onChange={update('middle_name')}
          autoComplete="additional-name"
        />
        <Input
          label="Passport ID"
          name="passport_id"
          value={form.passport_id}
          onChange={update('passport_id')}
          autoComplete="off"
          required
        />
        <Input
          label="Date of birth"
          name="date_of_birth"
          type="date"
          value={form.date_of_birth}
          onChange={update('date_of_birth')}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={update('password')}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-[14px] text-danger">{error}</p>
        )}

        <div className="mt-2 pb-4">
          <Button type="submit" fullWidth loading={submitting}>
            Continue to face scan
          </Button>
        </div>
      </form>
    </PageShell>
  )
}
