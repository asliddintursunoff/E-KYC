import type { RefObject } from 'react'
import { ScanFrame } from '@/components/camera/ScanFrame'
import { GuidanceBanner } from '@/components/camera/GuidanceBanner'

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>
  scanState: ScanState
  guidanceMessage: string | null
  guidanceTone?: 'neutral' | 'error' | 'success'
  /** When false, don't render the circular scan frame (used for live WS verification) */
  showScanFrame?: boolean
}

export function CameraView({
  videoRef,
  scanState,
  guidanceMessage,
  guidanceTone = 'neutral',
  showScanFrame = true,
}: CameraViewProps) {
  return (
    <div className="relative w-full mx-auto overflow-hidden rounded-4xl bg-base-surface h-[340px] sm:h-[420px] lg:h-[520px] max-w-[640px] sm:max-w-[760px] lg:max-w-[1000px]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full -scale-x-100 object-cover"
      />
      {showScanFrame && <ScanFrame state={scanState} />}
      <GuidanceBanner message={guidanceMessage} tone={guidanceTone} />

      {/* Vignette to keep focus on the scan area */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  )
}
