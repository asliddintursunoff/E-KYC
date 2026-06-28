import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

interface UseCameraStreamOptions {
  facingMode?: 'user' | 'environment'
  autoStart?: boolean
}

/**
 * Manages a getUserMedia video stream and exposes a ref to attach to a
 * <video> element. Handles permission states and cleans up the stream
 * automatically on unmount.
 */
export function useCameraStream(options: UseCameraStreamOptions = {}) {
  const { facingMode = 'user', autoStart = true } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [permission, setPermission] = useState<CameraPermissionState>('idle')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('unavailable')
      setError('Camera access is not supported on this device.')
      return
    }

    setPermission('requesting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPermission('granted')
    } catch (err) {
      setPermission('denied')
      setError(
        err instanceof Error
          ? err.message
          : 'Camera permission was denied. Please allow camera access to continue.'
      )
    }
  }, [facingMode])

  useEffect(() => {
    if (autoStart) {
      start()
    }
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { videoRef, permission, error, start, stop }
}
