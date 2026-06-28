import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title?: string
  onBack?: () => void
  showBack?: boolean
}

export function TopBar({ title, onBack, showBack = true }: TopBarProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) return onBack()
    navigate(-1)
  }

  return (
    <div className="mb-8 flex h-10 items-center justify-between">
      {showBack ? (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink transition-colors hover:bg-white/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <span className="w-9" />
      )}
      {title && <h1 className="text-[15px] font-semibold text-ink">{title}</h1>}
      <span className="w-9" />
    </div>
  )
}
