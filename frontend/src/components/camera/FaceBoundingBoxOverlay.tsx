import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { FaceBox } from '@/types/websocket'

type BoxTone = 'neutral' | 'success' | 'error'

interface FaceBoundingBoxOverlayProps {
  videoRef: RefObject<HTMLVideoElement>
  faceBoxes: FaceBox[]
  tone?: BoxTone
  /** Must match the video element's own mirroring so the box lines up. */
  mirrored?: boolean
}

const TONE_COLOR: Record<BoxTone, string> = {
  neutral: 'rgba(10, 132, 255, 0.95)',
  success: 'rgba(48, 209, 88, 0.95)',
  error: 'rgba(255, 69, 58, 0.95)',
}

/**
 * Renders a square around each detected face on a canvas positioned exactly
 * over the video element. Boxes arrive as [x, y, width, height] in source
 * video pixel coordinates (see parseFaceBoxes) and are converted to squares
 * here — using the longer side of each box — then scaled to the rendered
 * video size and corrected for horizontal mirroring.
 */
export function FaceBoundingBoxOverlay({
  videoRef,
  faceBoxes,
  tone = 'neutral',
  mirrored = true,
}: FaceBoundingBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const draw = () => {
      const { clientWidth, clientHeight, videoWidth, videoHeight } = video
      if (!videoWidth || !videoHeight || !clientWidth || !clientHeight) return

      canvas.width = clientWidth
      canvas.height = clientHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const scaleX = clientWidth / videoWidth
      const scaleY = clientHeight / videoHeight

      ctx.strokeStyle = TONE_COLOR[tone]
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'

      // Draw a center target and a guidance line from detected face center
      // to the ideal frame center. This helps users correct head pose and
      // centering instead of a raw bounding square.
      const targetX = clientWidth / 2
      const targetY = clientHeight / 2

      // subtle target circle
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(targetX, targetY, Math.max(28, Math.min(clientWidth, clientHeight) * 0.07), 0, Math.PI * 2)
      ctx.stroke()

      faceBoxes.forEach(([x, y, w, h]) => {
        if ([x, y, w, h].some((v) => typeof v !== 'number' || Number.isNaN(v))) return

        const cx = x + w / 2
        const cy = y + h / 2
        let drawCx = cx * scaleX
        const drawCy = cy * scaleY

        if (mirrored) {
          drawCx = clientWidth - drawCx
        }

        // line from face center to target center
        ctx.strokeStyle = TONE_COLOR[tone]
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(drawCx, drawCy)
        ctx.lineTo(targetX, targetY)
        ctx.stroke()

        // small marker at face center
        ctx.fillStyle = TONE_COLOR[tone]
        ctx.beginPath()
        ctx.arc(drawCx, drawCy, 6, 0, Math.PI * 2)
        ctx.fill()

        // optionally draw a subtle bounding dot ring to indicate size
        const radius = Math.max(12, Math.min(w, h) * Math.max(scaleX, scaleY) * 0.5)
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(drawCx, drawCy, radius, 0, Math.PI * 2)
        ctx.stroke()
      })
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [faceBoxes, videoRef, tone, mirrored])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
}

// legacy: corner-square helper removed — overlay now draws center guidance
