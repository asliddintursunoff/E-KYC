type ScanState = 'idle' | 'scanning' | 'success' | 'error'

interface ScanFrameProps {
  state: ScanState
}

const ringColor: Record<ScanState, string> = {
  idle: 'border-white/25',
  scanning: 'border-accent',
  success: 'border-success',
  error: 'border-danger',
}

const glowColor: Record<ScanState, string> = {
  idle: '',
  scanning: 'shadow-[0_0_40px_8px_rgba(10,132,255,0.25)]',
  success: 'shadow-[0_0_40px_8px_rgba(48,209,88,0.3)]',
  error: 'shadow-[0_0_40px_8px_rgba(255,69,58,0.3)]',
}

/**
 * The circular scan frame that sits over the camera preview, mirroring the
 * Face ID animation: a static ring at rest, a rotating gradient arc while
 * actively scanning, and a solid color fill on success/error.
 */
export function ScanFrame({ state }: ScanFrameProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-[68vw] max-h-80 w-[68vw] max-w-80">
        {/* Ambient pulse ring, only while idle/scanning */}
        {(state === 'idle' || state === 'scanning') && (
          <div className="absolute inset-0 animate-pulse-ring rounded-full bg-accent/10" />
        )}

        {/* Base ring */}
        <div
          className={`
            absolute inset-0 rounded-full border-[3px] transition-colors duration-300
            ${ringColor[state]} ${glowColor[state]}
          `}
        />

        {/* Rotating scan arc */}
        {state === 'scanning' && (
          <div className="absolute inset-0 animate-scan-rotate rounded-full">
            <div
              className="absolute -top-[3px] left-1/2 h-[3px] w-1/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
              style={{ filter: 'blur(0.5px)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
