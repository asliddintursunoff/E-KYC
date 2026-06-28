import type { FrameInterval } from '@/types/websocket'

declare global {
  interface Window {
    __ENV__?: {
      VITE_API_BASE_URL?: string
      VITE_WS_BASE_URL?: string
      VITE_FACE_FRAME_INTERVAL?: string
    }
  }
}

/**
 * Reads a config value, preferring the runtime value injected by
 * docker-entrypoint.sh (window.__ENV__) over the build-time Vite value.
 * This lets one built image be reconfigured per environment via Compose
 * `environment:` without rebuilding.
 */
function readConfig(key: 'VITE_API_BASE_URL' | 'VITE_WS_BASE_URL' | 'VITE_FACE_FRAME_INTERVAL'): string | undefined {
  return window.__ENV__?.[key] || import.meta.env[key]
}

const RAW_INTERVAL = readConfig('VITE_FACE_FRAME_INTERVAL') ?? '1'

function parseFrameInterval(raw: string): FrameInterval {
  if (raw === 'ALL_TIME') return 'ALL_TIME'
  const parsed = Number(raw)
  if (parsed === 1 || parsed === 0.5 || parsed === 0.25) return parsed
  console.warn(
    `[env] Invalid VITE_FACE_FRAME_INTERVAL "${raw}", falling back to 1 second.`
  )
  return 1
}

export const env = {
  apiBaseUrl: readConfig('VITE_API_BASE_URL') ?? 'http://localhost:8000',
  wsBaseUrl: readConfig('VITE_WS_BASE_URL') ?? 'ws://localhost:8000',
  frameInterval: parseFrameInterval(RAW_INTERVAL),
} as const
