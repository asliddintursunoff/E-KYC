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

      faceBoxes.forEach(([x, y, w, h]) => {
        if ([x, y, w, h].some((v) => typeof v !== 'number' || Number.isNaN(v))) return

        // Force a square using the longer side, centered on the original box.
        const side = Math.max(w, h)
        const cx = x + w / 2
        const cy = y + h / 2
        const squareX = cx - side / 2
        const squareY = cy - side / 2

        let drawX = squareX * scaleX
        const drawY = squareY * scaleY
        const drawSide = side * Math.max(scaleX, scaleY)

        // The video itself is mirrored via CSS (selfie view), so the
        // backend's un-mirrored coordinates must be flipped to line up.
        if (mirrored) {
          drawX = clientWidth - drawX - drawSide
        }

        drawCornerBracketSquare(ctx, drawX, drawY, drawSide)
      })
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [faceBoxes, videoRef, tone, mirrored])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
}

/**
 * Draws a Face-ID-style square: corner brackets rather than a full
 * unbroken outline, matching the biometric-scanner visual language used
 * elsewhere in the camera UI.
 */
function drawCornerBracketSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const cornerLength = Math.max(size * 0.18, 14)
  const r = 10 // corner radius

  ctx.beginPath()

  // Top-left
  ctx.moveTo(x, y + cornerLength)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.lineTo(x + cornerLength, y)

  // Top-right
  ctx.moveTo(x + size - cornerLength, y)
  ctx.lineTo(x + size - r, y)
  ctx.arcTo(x + size, y, x + size, y + r, r)
  ctx.lineTo(x + size, y + cornerLength)

  // Bottom-right
  ctx.moveTo(x + size, y + size - cornerLength)
  ctx.lineTo(x + size, y + size - r)
  ctx.arcTo(x + size, y + size, x + size - r, y + size, r)
  ctx.lineTo(x + size - cornerLength, y + size)

  // Bottom-left
  ctx.moveTo(x + cornerLength, y + size)
  ctx.lineTo(x + r, y + size)
  ctx.arcTo(x, y + size, x, y + size - r, r)
  ctx.lineTo(x, y + size - cornerLength)

  ctx.stroke()
}
