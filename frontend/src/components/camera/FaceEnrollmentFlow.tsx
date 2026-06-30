import { useCallback, useEffect, useRef, useState } from 'react'
import { useCameraStream } from '@/hooks/useCameraStream'
import { useFrameCapture } from '@/hooks/useFrameCapture'
import { CameraView } from '@/components/camera/CameraView'
import { Button } from '@/components/ui/Button'
import { faceService } from '@/services/faceService'
import { pollJobUntilDone, JobFailureError, JobTimeoutError } from '@/services/jobPoller'
import { extractErrorMessage } from '@/services/apiClient'
import type { JobSuccessResponse } from '@/types/api'

type EnrollmentStage = 'ready' | 'capturing' | 'uploading' | 'processing' | 'error'

interface FaceEnrollmentFlowProps {
  /** Bearer token authorizing the selfie upload (selfie_verification_token). */
  selfieToken: string
  onSuccess: (tokens: JobSuccessResponse) => void
  title: string
  subtitle: string
}

export function FaceEnrollmentFlow({
  selfieToken,
  onSuccess,
  title,
  subtitle,
}: FaceEnrollmentFlowProps) {
  const { videoRef, permission, error: cameraError } = useCameraStream()
  const { captureBlob } = useFrameCapture(videoRef)

  const [stage, setStage] = useState<EnrollmentStage>('ready')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const errorTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!errorMessage) {
      return
    }

    if (errorTimeoutRef.current !== null) {
      window.clearTimeout(errorTimeoutRef.current)
    }

    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null)
      setStage('ready')
      errorTimeoutRef.current = null
    }, 10000)

    return () => {
      if (errorTimeoutRef.current !== null) {
        window.clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = null
      }
    }
  }, [errorMessage])

  const handleCapture = useCallback(async () => {
    setStage('capturing')
    setErrorMessage(null)

    const blob = await captureBlob()
    if (!blob) {
      setErrorMessage('Could not capture image. Please try again.')
      setStage('error')
      return
    }

    setStage('uploading')

    try {
      const { job_id } = await faceService.uploadSelfie(selfieToken, blob)
      setStage('processing')

      const result = await pollJobUntilDone({ jobId: job_id, authToken: selfieToken })
      onSuccess(result)
    } catch (err) {
      if (err instanceof JobTimeoutError || err instanceof JobFailureError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(extractErrorMessage(err, 'Something went wrong. Please try again.'))
      }
      setStage('error')
    }
  }, [captureBlob, selfieToken, onSuccess])

  const scanState =
    stage === 'uploading' || stage === 'processing'
      ? 'scanning'
      : stage === 'error'
        ? 'error'
        : 'idle'

  const guidanceMessage =
    permission === 'denied'
      ? cameraError ?? 'Camera permission denied'
      : stage === 'uploading'
        ? 'Uploading your photo…'
        : stage === 'processing'
          ? 'Verifying your face…'
          : stage === 'error'
            ? errorMessage
            : 'Center your face in the frame'

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 text-center">
        <h2 className="text-[20px] font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 text-[14px] text-ink-muted">{subtitle}</p>
      </div>

      <CameraView
        videoRef={videoRef}
        scanState={scanState}
        guidanceMessage={guidanceMessage}
        guidanceTone={stage === 'error' ? 'error' : 'neutral'}
      />

      <div className="mt-4 flex flex-col gap-3 pb-6">
        <Button
          fullWidth
          onClick={handleCapture}
          loading={stage === 'capturing' || stage === 'uploading' || stage === 'processing'}
          disabled={permission !== 'granted'}
        >
          {stage === 'processing' ? 'Verifying…' : 'Capture photo'}
        </Button>
      </div>
    </div>
  )
}
