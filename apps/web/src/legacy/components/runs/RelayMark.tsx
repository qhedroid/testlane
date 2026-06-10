/** Relay logo mark (chevrons + baton) — simplified from prototype SVG. */
export function RelayMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <polyline
        points="2,4 8,11 2,18"
        stroke="rgba(107,173,232,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="7,4 13,11 7,18"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="11" r="2.8" fill="#6AADE8" />
    </svg>
  )
}
