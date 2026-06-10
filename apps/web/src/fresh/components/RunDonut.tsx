/** SVG donut chart — ported from mockup makeDonut() */
export function RunDonut({
  pass,
  fail,
  blocked,
  notrun,
  size = 80,
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
  size?: number
}) {
  const total = pass + fail + blocked + notrun
  if (total === 0) return null

  const scale = size / 80
  const r = 32 * scale
  const cx = 40 * scale
  const cy = 40 * scale
  const stroke = 10 * scale
  const C = 2 * Math.PI * r
  const done = pass + fail + blocked
  const pct = Math.round((done / total) * 100)
  const vb = 80 * scale

  function seg(len: number, color: string, cumStart: number) {
    if (len <= 0) return null
    return (
      <circle
        key={`${color}-${cumStart}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
        strokeDashoffset={(C - cumStart).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    )
  }

  const pL = (pass / total) * C
  const fL = (fail / total) * C
  const bL = (blocked / total) * C
  const nL = (notrun / total) * C

  return (
    <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} style={{ display: 'block', flexShrink: 0 }} className="rct-donut">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5EBF2" strokeWidth={stroke} />
      {seg(pL, '#2E7D32', 0)}
      {seg(fL, '#C62828', pL)}
      {seg(bL, '#E65100', pL + fL)}
      {seg(nL, '#C5D1DE', pL + fL + bL)}
      <text
        x={cx}
        y={cy + 1 * scale}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11 * scale}
        fontWeight={700}
        fill="#0F1C2E"
        fontFamily="ui-monospace,'SF Mono',monospace"
      >
        {pct}%
      </text>
      <text x={cx} y={cy + 13 * scale} textAnchor="middle" fontSize={7 * scale} fill="#7A92AB" fontFamily="-apple-system,system-ui,sans-serif">
        done
      </text>
    </svg>
  )
}
