/** Official Testlane brand mark — three rising lanes to a pass (teal on graphite). */
export function TestlaneMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <title>Testlane</title>
      <rect width="1024" height="1024" rx="179.2" fill="#1A1D20" />
      <g transform="translate(153.6 153.6) scale(0.7)">
        <rect x="242" y="542" width="140" height="260" rx="45" fill="#3D4045" />
        <rect x="442" y="382" width="140" height="420" rx="45" fill="#0F6E56" />
        <rect x="642" y="222" width="140" height="580" rx="45" fill="#4FB89F" />
      </g>
    </svg>
  )
}
