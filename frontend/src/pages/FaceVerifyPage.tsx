import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { TopBar } from '@/components/layout/TopBar'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { useCameraStream } from '@/hooks/useCameraStream'
import { useFaceVerificationSocket } from '@/hooks/useFaceVerificationSocket'
import { useFaceFlowStore } from '@/store/faceFlowStore'
import { useAuthStore } from '@/store/authStore'
import { getGuidanceMessage } from '@/utils/guidanceMessages'
import { parseFaceBoxes } from '@/utils/parseFaceBoxes'
import type { WSErrorMessage, WSMessage, WSSuccessMessage } from '@/types/websocket'

export function FaceVerifyPage() {
  const navigate = useNavigate()
  const temporaryLoginToken = useAuthStore((s) => s.temporaryLoginToken)
  const setTokens = useAuthStore((s) => s.setTokens)

  const { videoRef, permission, error: cameraError } = useCameraStream()

  const { stage, setStage, guidanceMessage, setGuidance, setFaceBoxes, reset, faceBoxes } =
    useFaceFlowStore()

  const [socketActive, setSocketActive] = useState(true)

  const handleSuccess = useCallback(
    (message: WSSuccessMessage) => {
      setStage('success')
      setGuidance(null, message.message)
      setTokens(message.data.access_token, message.data.refresh_token)
      setSocketActive(false)
      navigate('/profile')
    },
    [navigate, setGuidance, setStage, setTokens]
  )

  const handleError = useCallback(
    (message: WSErrorMessage) => {
      setStage('error')
      setGuidance(message.code, getGuidanceMessage(message.code, message.message))
      setFaceBoxes(parseFaceBoxes(message.data))
    },
    [setStage, setGuidance, setFaceBoxes]
  )

  // Handles steady-state tracking frames that aren't an error or the final
  // success message — just live face_location updates while everything is
  // fine. The backend may or may not send these as a distinct message type;
  // if it doesn't, this is simply never called and boxes still update via
  // handleError on the next non-OK frame.
  const handleTracking = useCallback(
    (message: WSMessage) => {
      if (stage !== 'success') {
        setStage('capturing')
      }
      setGuidance(null, null)
      setFaceBoxes(parseFaceBoxes((message as { data?: unknown }).data))
    },
    [stage, setStage, setGuidance, setFaceBoxes]
  )

  const { connectionState, closeSocket } = useFaceVerificationSocket({
    token: temporaryLoginToken,
    videoRef,
    active: socketActive && permission === 'granted',
    onSuccess: handleSuccess,
    onError: handleError,
    onTracking: handleTracking,
  })

  const scanState = stage === 'success' ? 'success' : stage === 'error' ? 'error' : 'scanning'

  useEffect(() => {
    setStage('ready')
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (connectionState === 'open' && stage === 'ready') {
      setStage('capturing')
    }

    if (connectionState === 'open' && stage === 'capturing') {
      if (faceBoxes.length === 0) {
        setGuidance(null, 'Move your face into view')
      } else if (!guidanceMessage) {
        setGuidance(null, 'Keep your face centered')
      }
    }
  }, [connectionState, stage, setStage, faceBoxes, guidanceMessage, setGuidance])

  const handleRetry = () => {
    closeSocket()
    reset()
    setStage('ready')
    setSocketActive(true)
  }

  const handleReturnToLogin = () => {
    closeSocket()
    navigate('/login')
  }

  if (!temporaryLoginToken) {
    return <Navigate to="/login" replace />
  }

  // Dedicated error screen for connection/auth failures.
  if (connectionState === 'auth_error' || connectionState === 'connection_error') {
    return (
      <PageShell>
        <TopBar title="Connection issue" showBack={false} />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-ink">
            {connectionState === 'auth_error' ? 'Session expired' : "Couldn't connect"}
          </h2>
          <p className="mt-2 max-w-[260px] text-[14px] text-ink-muted">
            {connectionState === 'auth_error'
              ? 'Your login session is no longer valid. Please log in again.'
              : 'We had trouble reaching the verification service. Check your connection and try again.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 pb-4">
          {connectionState === 'connection_error' && (
            <Button fullWidth onClick={handleRetry}>
              Retry
            </Button>
          )}
          <Button fullWidth variant="secondary" onClick={handleReturnToLogin}>
            Return to login
          </Button>
        </div>
      </PageShell>
    )
  }

  const tone = stage === 'error' ? 'error' : stage === 'success' ? 'success' : 'neutral'

  const displayMessage =
    permission === 'denied'
      ? cameraError ?? 'Camera permission denied'
      : guidanceMessage

  return (
    <PageShell maxWidth="lg">
      <TopBar title="Face verification" showBack={false} />

      <div className="flex flex-1 flex-col">
        <div className="mb-6 text-center">
          <h2 className="text-[20px] font-semibold text-ink">Verifying your identity</h2>
          <p className="mt-1.5 text-[14px] text-ink-muted">
            Keep your face centered and well lit
          </p>
        </div>

        <CameraView
          videoRef={videoRef}
          scanState={scanState}
          guidanceMessage={displayMessage}
          guidanceTone={tone}
          showScanFrame={false}
        />

        <div className="mt-4 flex flex-col gap-3 pb-6">
          <Button fullWidth variant="ghost" onClick={handleReturnToLogin}>
            Cancel
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
