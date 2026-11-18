export function WheelMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.65" stroke="currentColor" strokeWidth="1.55" />
      <path d="M12 12V3.35a8.65 8.65 0 0 1 7.491 12.975ZM12 12l-7.491 4.325a8.65 8.65 0 0 1 0-8.65Z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.95" fill="currentColor" />
    </svg>
  )
}

export function Twinkle({ size = 18, fill = 'currentColor' }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M12 1.5c1.25 6.4 4.1 9.25 10.5 10.5-6.4 1.25-9.25 4.1-10.5 10.5C10.75 16.1 7.9 13.25 1.5 12 7.9 10.75 10.75 7.9 12 1.5Z" />
    </svg>
  )
}
