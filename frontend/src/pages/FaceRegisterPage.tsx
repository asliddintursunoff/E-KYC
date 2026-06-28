import { Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { TopBar } from '@/components/layout/TopBar'
import { FaceEnrollmentFlow } from '@/components/camera/FaceEnrollmentFlow'
import { useAuthStore } from '@/store/authStore'
import type { JobSuccessResponse } from '@/types/api'

export function FaceRegisterPage() {
  const navigate = useNavigate()
  const selfieVerificationToken = useAuthStore((s) => s.selfieVerificationToken)
  const setTokens = useAuthStore((s) => s.setTokens)

  // Guard: this page only makes sense right after step 1 of registration.
  if (!selfieVerificationToken) {
    return <Navigate to="/register" replace />
  }

  const handleSuccess = (result: JobSuccessResponse) => {
    setTokens(result.access_token, result.refresh_token)
    navigate('/profile')
  }

  return (
    <PageShell>
      <TopBar title="Face scan" showBack={false} />
      <FaceEnrollmentFlow
        selfieToken={selfieVerificationToken}
        onSuccess={handleSuccess}
        title="Scan your face"
        subtitle="We use this to securely verify it's you"
      />
    </PageShell>
  )
}
