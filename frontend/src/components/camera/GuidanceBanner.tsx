interface GuidanceBannerProps {
  message: string | null
  tone?: 'neutral' | 'error' | 'success'
}

const toneClasses = {
  neutral: 'bg-white/10 text-ink',
  error: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
}

export function GuidanceBanner({ message, tone = 'neutral' }: GuidanceBannerProps) {
  if (!message) return null

  return (
    <div className="absolute inset-x-0 bottom-28 flex justify-center px-6">
      <div
        className={`
          animate-fade-in rounded-full border border-white/10 px-5 py-2.5
          text-center text-[14px] font-medium backdrop-blur-md
          ${toneClasses[tone]}
        `}
      >
        {message}
      </div>
    </div>
  )
}
