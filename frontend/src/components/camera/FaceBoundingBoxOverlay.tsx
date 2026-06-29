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

      // Draw proper Face ID-style bounding boxes (not circles or guidance lines)
      faceBoxes.forEach(([x, y, w, h]) => {
        if ([x, y, w, h].some((v) => typeof v !== 'number' || Number.isNaN(v))) return

        // x, y, w, h are video coordinates from parseFaceBoxes (bbox from InsightFace)
        // scale them to match the rendered canvas size
        let boxX = x * scaleX
        let boxY = y * scaleY
        const boxW = w * scaleX
        const boxH = h * scaleY

        // mirror horizontally for selfie view (video is already flipped via CSS)
        if (mirrored) {
          boxX = clientWidth - boxX - boxW
        }

        // draw main rectangle border like iPhone Face ID / Android BiometricPrompt
        // reduce height slightly for better proportions (use ~85% of detected height)
        const adjustedH = boxH * 0.85
        const adjustedY = boxY + (boxH - adjustedH) * 0.5 // center vertically
        ctx.strokeStyle = TONE_COLOR[tone]
        ctx.lineWidth = 3
        ctx.strokeRect(boxX, adjustedY, boxW, adjustedH)

        // add corner brackets for visual polish
        const cornerLen = Math.max(12, Math.min(boxW, adjustedH) * 0.15)
        drawCornerBrackets(ctx, boxX, adjustedY, boxW, adjustedH, cornerLen, TONE_COLOR[tone])
      })
    }

    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [faceBoxes, videoRef, tone, mirrored])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
}

/**
 * Draws corner brackets for a bounding box — thick visible corners
 * like Face ID / Android biometric UI.
 */
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cornerLen: number,
  color: string
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.beginPath()

  // Top-left
  ctx.moveTo(x, y + cornerLen)
  ctx.lineTo(x, y)
  ctx.lineTo(x + cornerLen, y)

  // Top-right
  ctx.moveTo(x + w - cornerLen, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + cornerLen)

  // Bottom-right
  ctx.moveTo(x + w, y + h - cornerLen)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x + w - cornerLen, y + h)

  // Bottom-left
  ctx.moveTo(x + cornerLen, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + h - cornerLen)

  ctx.stroke()
}
