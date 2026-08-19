// Recall's brand mark.
export function RecallLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0D9488" />
      <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill="white" />
      <path d="M12 6.5V4M17.5 12H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Generic mark for a third-party client that has no logo of its own.
export function ClientMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0F172A" />
      <path
        d="M8 9h8M8 12.5h8M8 16h5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
