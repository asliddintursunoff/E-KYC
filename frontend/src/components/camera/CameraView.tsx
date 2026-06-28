import type { RefObject } from 'react'
import { ScanFrame } from '@/components/camera/ScanFrame'
import { FaceBoundingBoxOverlay } from '@/components/camera/FaceBoundingBoxOverlay'
import { GuidanceBanner } from '@/components/camera/GuidanceBanner'
import type { FaceBox } from '@/types/websocket'

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>
  scanState: ScanState
  guidanceMessage: string | null
  guidanceTone?: 'neutral' | 'error' | 'success'
  faceBoxes?: FaceBox[]
  /**
   * When true, draws a live square around the backend-reported face
   * location instead of the static circular scan frame. Use this for the
   * WebSocket verification flow, where the backend continuously reports
   * face_location. The registration/re-enrollment flow (a single still
   * capture, no live tracking stream) keeps the circular scan frame.
   */
  useFaceBoxes?: boolean
}

export function CameraView({
  videoRef,
  scanState,
  guidanceMessage,
  guidanceTone = 'neutral',
  faceBoxes = [],
  useFaceBoxes = false,
}: CameraViewProps) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-4xl bg-base-surface">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full -scale-x-100 object-cover"
      />
      {useFaceBoxes ? (
        <FaceBoundingBoxOverlay videoRef={videoRef} faceBoxes={faceBoxes} tone={guidanceTone} />
      ) : (
        <ScanFrame state={scanState} />
      )}
      <GuidanceBanner message={guidanceMessage} tone={guidanceTone} />

      {/* Vignette to keep focus on the scan area */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  )
}
