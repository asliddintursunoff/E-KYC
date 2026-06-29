interface GuidanceBannerProps {
  message: string | null
  tone?: 'neutral' | 'error' | 'success'
}

const toneClasses = {
  neutral: 'bg-black/75 text-white border-white/20',
  error: 'bg-red-600/85 text-white border-red-700',
  success: 'bg-green-600/85 text-white border-green-700',
}

export function GuidanceBanner({ message, tone = 'neutral' }: GuidanceBannerProps) {
  if (!message) return null

  return (
    <div className="absolute inset-x-0 bottom-8 flex justify-center px-6 z-50">
      <div
        className={`
          animate-fade-in rounded-full border px-6 py-3
          text-center text-[15px] font-semibold backdrop-blur-md shadow-lg
          ${toneClasses[tone]}
        `}
      >
        {message}
      </div>
    </div>
  )
}
