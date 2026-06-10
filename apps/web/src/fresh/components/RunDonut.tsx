'use client'

import { useCallback, useMemo, useState } from 'react'

type Segment = {
  key: string
  count: number
  color: string
  label: string
  cumStart: number
  len: number
}

/** SVG donut chart — ported from mockup makeDonut() */
export function RunDonut({
  pass,
  fail,
  blocked,
  notrun,
  skipped = 0,
  size = 80,
  showCompleteLabel = true,
  interactive = false,
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
  skipped?: number
  size?: number
  showCompleteLabel?: boolean
  interactive?: boolean
}) {
  const total = pass + fail + blocked + notrun + skipped
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const geometry = useMemo(() => {
    if (total === 0) return null
    const scale = size / 80
    const r = 32 * scale
    const cx = 40 * scale
    const cy = 40 * scale
    const stroke = Math.max(7, 10 * scale - (size > 100 ? 2 : 0))
    const C = 2 * Math.PI * r
    const done = pass + fail + blocked + skipped
    const pct = Math.round((done / total) * 100)
    const vb = 80 * scale
    const pL = (pass / total) * C
    const fL = (fail / total) * C
    const bL = (blocked / total) * C
    const sL = (skipped / total) * C
    const nL = (notrun / total) * C
    const segments: Segment[] = [
      { key: 'pass', count: pass, color: '#2E7D32', label: 'Passed', cumStart: 0, len: pL },
      { key: 'fail', count: fail, color: '#C62828', label: 'Failed', cumStart: pL, len: fL },
      { key: 'blocked', count: blocked, color: '#E65100', label: 'Blocked', cumStart: pL + fL, len: bL },
      { key: 'skipped', count: skipped, color: '#4527A0', label: 'Skipped', cumStart: pL + fL + bL, len: sL },
      { key: 'notrun', count: notrun, color: '#C5D1DE', label: 'Not run', cumStart: pL + fL + bL + sL, len: nL },
    ].filter((s) => s.len > 0)
    const pctSize = showCompleteLabel ? 15 * scale : 18 * scale
    const labelSize = 7 * scale
    const pctY = showCompleteLabel ? cy - 3 * scale : cy
    return { scale, r, cx, cy, stroke, C, pct, vb, segments, pctSize, labelSize, pctY }
  }, [total, pass, fail, blocked, notrun, skipped, size, showCompleteLabel])

  const showTip = useCallback(
    (seg: Segment, e: React.MouseEvent) => {
      if (!interactive || !geometry) return
      const pct = total ? Math.round((seg.count / total) * 100) : 0
      const rect = (e.currentTarget as SVGElement).closest('.donut-wrap')?.getBoundingClientRect()
      if (!rect) return
      setTooltip({
        text: `${seg.count} (${pct}%) ${seg.label}`,
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 28,
      })
    },
    [interactive, geometry, total],
  )

  if (!geometry) return null

  const { r, cx, cy, stroke, pct, vb, segments, pctSize, labelSize, pctY } = geometry

  function segEl(seg: Segment, hit = false) {
    if (seg.len <= 0) return null
    return (
      <circle
        key={`${seg.key}-${hit ? 'hit' : 'vis'}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={hit ? 'transparent' : seg.color}
        strokeWidth={hit ? stroke + 10 : stroke}
        strokeDasharray={`${seg.len.toFixed(2)} ${(geometry.C - seg.len).toFixed(2)}`}
        strokeDashoffset={(geometry.C - seg.cumStart).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={hit ? { cursor: 'pointer', pointerEvents: 'stroke' } : undefined}
        onMouseEnter={hit ? (e) => showTip(seg, e) : undefined}
        onMouseMove={hit ? (e) => showTip(seg, e) : undefined}
        onMouseLeave={hit ? () => setTooltip(null) : undefined}
      />
    )
  }

  return (
    <div className={`donut-wrap${interactive ? ' interactive' : ''}`} style={{ position: 'relative', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} style={{ display: 'block' }} className="rct-donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5EBF2" strokeWidth={stroke} />
        {segments.map((s) => segEl(s))}
        {interactive ? segments.map((s) => segEl(s, true)) : null}
        <text
          x={cx}
          y={pctY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={pctSize}
          fontWeight={800}
          fill="#0F1C2E"
          fontFamily="ui-monospace,'SF Mono',monospace"
          style={{ pointerEvents: 'none' }}
        >
          {pct}%
        </text>
        {showCompleteLabel ? (
          <text
            x={cx}
            y={pctY + 13 * (size / 80)}
            textAnchor="middle"
            fontSize={labelSize}
            fontWeight={600}
            fill="#7A92AB"
            fontFamily="-apple-system,system-ui,sans-serif"
            letterSpacing="0.06em"
            style={{ pointerEvents: 'none' }}
          >
            COMPLETE
          </text>
        ) : null}
      </svg>
      {tooltip ? (
        <div className="donut-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      ) : null}
    </div>
  )
}
