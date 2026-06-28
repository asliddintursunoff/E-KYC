interface FaceMarkProps {
  size?: number
  className?: string
}

/**
 * The product's brand mark: a minimal face-scan glyph (corner brackets
 * around rounded face geometry), echoing the Face ID / biometric framing
 * motif used throughout the camera UI.
 */
export function FaceMark({ size = 56, className = '' }: FaceMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      className={className}
    >
      {/* corner brackets */}
      <path d="M6 16V10C6 7.79086 7.79086 6 10 6H16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 6H46C48.2091 6 50 7.79086 50 10V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M50 40V46C50 48.2091 48.2091 50 46 50H40" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 50H10C7.79086 50 6 48.2091 6 46V40" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

      {/* face */}
      <circle cx="28" cy="25" r="10" stroke="currentColor" strokeWidth="2" opacity="0.85" />
      <path
        d="M19 38C20.5 34 24 32 28 32C32 32 35.5 34 37 38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}
