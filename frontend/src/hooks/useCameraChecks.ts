import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

interface CameraChecksOptions {
  sampleInterval?: number // ms
  blurThreshold?: number // variance threshold
  motionThreshold?: number // movement score
}

export function useCameraChecks(videoRef: RefObject<HTMLVideoElement>, opts?: CameraChecksOptions) {
  const { sampleInterval = 300, blurThreshold = 100, motionThreshold = 6 } = opts || {}
  const lastImageRef = useRef<Uint8ClampedArray | null>(null)
  const [isBlurry, setIsBlurry] = useState(false)
  const [motionScore, setMotionScore] = useState(0)
  const [lastMotionAt, setLastMotionAt] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    let raf = 0

    const sample = () => {
      const video = videoRef.current
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        raf = window.setTimeout(sample, sampleInterval)
        return
      }

      const w = Math.min(320, video.videoWidth)
      const h = Math.floor((w / video.videoWidth) * video.videoHeight)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, w, h)
      const img = ctx.getImageData(0, 0, w, h)
      const gray = new Uint8ClampedArray(w * h)
      // convert to grayscale
      for (let i = 0, p = 0; i < img.data.length; i += 4, ++p) {
        const r = img.data[i]
        const g = img.data[i + 1]
        const b = img.data[i + 2]
        gray[p] = (0.299 * r + 0.587 * g + 0.114 * b) | 0
      }

      // simple variance of Laplacian approximation: apply tiny kernel [-1,2,-1] horizontally and vertically
      let sum = 0
      let sumSq = 0
      const lap = new Int16Array(w * h)
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x
          const val =
            -gray[idx - w] - gray[idx + w] - gray[idx - 1] - gray[idx + 1] + 4 * gray[idx]
          lap[idx] = val
          sum += val
          sumSq += val * val
        }
      }

      const n = (w - 2) * (h - 2)
      const mean = sum / n
      const variance = sumSq / n - mean * mean
      if (mounted) setIsBlurry(variance < blurThreshold)

      // motion score: compare gray to lastImageRef
      let motion = 0
      if (lastImageRef.current) {
        const prev = lastImageRef.current
        let acc = 0
        const L = Math.min(prev.length, gray.length)
        for (let i = 0; i < L; i += 4) {
          // sample every 4th pixel for speed
          acc += Math.abs(gray[i] - prev[i])
        }
        motion = acc / (L / 4)
      }
      lastImageRef.current = gray
      if (mounted) {
        setMotionScore(motion)
        if (motion > motionThreshold) setLastMotionAt(Date.now())
      }

      raf = window.setTimeout(sample, sampleInterval)
    }

    sample()
    return () => {
      mounted = false
      clearTimeout(raf)
    }
  }, [videoRef, sampleInterval, blurThreshold, motionThreshold])

  const isMoving = lastMotionAt !== null && Date.now() - lastMotionAt < 3000

  return { isBlurry, motionScore, isMoving, lastMotionAt }
}
