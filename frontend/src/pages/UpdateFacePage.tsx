import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { TopBar } from '@/components/layout/TopBar'
import { FaceEnrollmentFlow } from '@/components/camera/FaceEnrollmentFlow'
import { useAuthStore } from '@/store/authStore'
import { tokenStorage } from '@/utils/tokenStorage'
import type { JobSuccessResponse } from '@/types/api'

export function UpdateFacePage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)

  // Re-enrollment runs through the same capture → upload → poll pipeline as
  // initial registration. The spec does not define a separate token-issuing
  // endpoint for re-enrollment, so the active session's access token is used
  // to authorize the selfie upload here instead of a selfie_verification_token.
  const accessToken = tokenStorage.getAccessToken()

  if (!accessToken) {
    navigate('/login', { replace: true })
    return null
  }

  const handleSuccess = (result: JobSuccessResponse) => {
    setTokens(result.access_token, result.refresh_token)
    navigate('/profile')
  }

  return (
    <PageShell>
      <TopBar title="Update face" />
      <FaceEnrollmentFlow
        selfieToken={accessToken}
        onSuccess={handleSuccess}
        title="Re-scan your face"
        subtitle="Capture a fresh photo to update your Face ID"
      />
    </PageShell>
  )
}
