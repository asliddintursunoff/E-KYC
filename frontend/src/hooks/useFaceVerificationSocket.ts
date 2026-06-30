import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { env } from '@/utils/env'
import type { WSErrorMessage, WSMessage, WSSuccessMessage } from '@/types/websocket'

export type WSConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'auth_error'
  | 'connection_error'

interface UseFaceVerificationSocketOptions {
  token: string | null
  videoRef: RefObject<HTMLVideoElement>
  /** Whether the socket should be actively streaming frames. */
  active: boolean
  onSuccess: (message: WSSuccessMessage) => void
  onError: (message: WSErrorMessage) => void
  /**
   * Called for any message that's neither the final success envelope nor
   * an error code — i.e. steady-state "face detected, all good" frames
   * that still carry live face_location data for box tracking.
   */
  onTracking?: (message: WSMessage) => void
}

/**
 * Connects to ws://.../ws/verification/?token=... and streams JPEG frames
 * from the given video element at a configurable interval. Parses incoming
 * success/error messages and forwards them to the caller.
 */
export function useFaceVerificationSocket(options: UseFaceVerificationSocketOptions) {
  const { token, videoRef, active, onSuccess, onError, onTracking } = options

  const [connectionState, setConnectionState] = useState<WSConnectionState>('idle')
  const socketRef = useRef<WebSocket | null>(null)
  const frameTimerRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const sendFrame = useCallback(() => {
    const socket = socketRef.current
    const video = videoRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN || !video || video.videoWidth === 0) {
      return
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob && socket.readyState === WebSocket.OPEN) {
          // Send as binary frame, per spec ("binary frame streaming").
          blob.arrayBuffer().then((buffer) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(buffer)
            }
          })
        }
      },
      'image/jpeg',
      0.85
    )
  }, [videoRef])

  const stopStreaming = useCallback(() => {
    if (frameTimerRef.current !== null) {
      if (env.frameInterval === 'ALL_TIME') {
        window.cancelAnimationFrame(frameTimerRef.current)
      } else {
        window.clearInterval(frameTimerRef.current)
      }
      frameTimerRef.current = null
    }
  }, [])

  const startStreaming = useCallback(() => {
    stopStreaming()

    if (env.frameInterval === 'ALL_TIME') {
      const loop = () => {
        sendFrame()
        frameTimerRef.current = window.requestAnimationFrame(loop)
      }
      frameTimerRef.current = window.requestAnimationFrame(loop)
      return
    }

    const intervalMs = Math.max(100, Math.round(env.frameInterval * 1000))
    frameTimerRef.current = window.setInterval(sendFrame, intervalMs)
  }, [sendFrame, stopStreaming])

  useEffect(() => {
    if (!active || !token) {
      return
    }

    setConnectionState('connecting')
    const url = `${env.wsBaseUrl}/ws/verification/?token=${encodeURIComponent(token)}`
    const socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket

    socket.onopen = () => {
      setConnectionState('open')
      sendFrame()
      startStreaming()
    }

    let successReceived = false

    socket.onmessage = (event) => {
      try {
        const parsed: WSMessage = JSON.parse(event.data)
        if (parsed.type === 'success') {
          successReceived = true
          stopStreaming()
          onSuccess(parsed)
        } else if (parsed.type === 'error') {
          onError(parsed)
        } else {
          // Steady-state tracking frame: face_location with no error/success.
          onTracking?.(parsed)
        }
      } catch {
        // Non-JSON message received; ignore silently to keep stream resilient.
      }
    }

    socket.onerror = () => {
      setConnectionState('connection_error')
    }

    socket.onclose = (event) => {
      stopStreaming()
      // If success was already received, don't override with connection error on close.
      if (successReceived) {
        return
      }
      // Common convention: 4401/4403 reserved for auth failures by this app's
      // backend; 4000 is success close (also ignore); treat any abnormal
      // non-1000/4000 close as a connection problem.
      if (event.code === 4401 || event.code === 4403 || event.code === 1008) {
        setConnectionState('auth_error')
      } else if (event.code !== 1000 && event.code !== 4000) {
        setConnectionState('connection_error')
      } else {
        setConnectionState('closed')
      }
    }

    return () => {
      stopStreaming()
      socket.close(1000)
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, token])

  const closeSocket = useCallback(() => {
    stopStreaming()
    socketRef.current?.close(1000)
    socketRef.current = null
  }, [stopStreaming])

  return { connectionState, closeSocket }
}
