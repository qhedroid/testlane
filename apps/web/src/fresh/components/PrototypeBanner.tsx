import type { ReactNode } from 'react'

type BannerKind = 'mock' | 'api' | 'placeholder'

interface PrototypeBannerProps {
  kind?: BannerKind
  children?: ReactNode
}

const DEFAULT_COPY: Record<BannerKind, ReactNode> = {
  mock: (
    <>
      <strong>Frontend prototype.</strong> Data shown here is local mock data only — not
      persisted to MySQL. Future API contracts are documented in{' '}
      <code>docs/implementation/frontend-contracts.md</code>.
    </>
  ),
  api: (
    <>
      <strong>API-backed.</strong> This screen reads and writes real data via the Relay
      HTTP API and MySQL.
    </>
  ),
  placeholder: (
    <>
      <strong>Planned module.</strong> Navigation is visible for demo coherence; full
      implementation is not started yet.
    </>
  ),
}

const ICON: Record<BannerKind, string> = {
  mock: 'ti-flask',
  api: 'ti-database',
  placeholder: 'ti-road',
}

export function PrototypeBanner({ kind = 'mock', children }: PrototypeBannerProps) {
  return (
    <div className={`source-banner source-banner-${kind}`}>
      <i className={`ti ${ICON[kind]}`} aria-hidden />
      <span>{children ?? DEFAULT_COPY[kind]}</span>
    </div>
  )
}
