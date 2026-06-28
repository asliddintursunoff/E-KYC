interface StatusBadgeProps {
  verified: boolean
}

export function StatusBadge({ verified }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1
        text-[13px] font-medium
        ${verified ? 'bg-success-dim text-success' : 'bg-warn-dim text-warn'}
      `}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${verified ? 'bg-success' : 'bg-warn'}`}
      />
      {verified ? 'Verified' : 'Unverified'}
    </span>
  )
}
