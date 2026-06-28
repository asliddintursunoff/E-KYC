import { useCallback } from 'react'
import type { RefObject } from 'react'

/**
 * Captures the current frame of a <video> element as a JPEG Blob,
 * using an offscreen canvas. Used for single-shot selfie capture
 * (registration / re-enrollment), as opposed to the continuous
 * frame streaming used during WebSocket verification.
 */
export function useFrameCapture(videoRef: RefObject<HTMLVideoElement>) {
  const captureBlob = useCallback(async (quality = 0.92): Promise<Blob | null> => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
  }, [videoRef])

  return { captureBlob }
}
