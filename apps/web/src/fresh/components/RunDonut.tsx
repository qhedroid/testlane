/** SVG donut chart — ported from mockup makeDonut() */
export function RunDonut({
  pass,
  fail,
  blocked,
  notrun,
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
}) {
  const total = pass + fail + blocked + notrun
  if (total === 0) return null

  const r = 26
  const cx = 34
  const cy = 34
  const C = 2 * Math.PI * r
  const done = pass + fail + blocked
  const pct = Math.round((done / total) * 100)

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
        strokeWidth={10}
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
    <svg viewBox="0 0 68 68" width="68" height="68" style={{ display: 'block', flexShrink: 0 }} className="rct-donut">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5EBF2" strokeWidth={10} />
      {seg(pL, '#2E7D32', 0)}
      {seg(fL, '#C62828', pL)}
      {seg(bL, '#E65100', pL + fL)}
      {seg(nL, '#C5D1DE', pL + fL + bL)}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={700}
        fill="#0F1C2E"
        fontFamily="ui-monospace,'SF Mono',monospace"
      >
        {pct}%
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={7} fill="#7A92AB" fontFamily="-apple-system,system-ui,sans-serif">
        done
      </text>
    </svg>
  )
}
