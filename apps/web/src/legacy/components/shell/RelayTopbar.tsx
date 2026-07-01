'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { ModuleSwitcher } from './ModuleSwitcher'
import { SearchModal } from './SearchModal'

interface Breadcrumb {
  label: string
  href?: string
}

interface RelayTopbarProps {
  breadcrumbs: Breadcrumb[]
  subtitle?: string
  actions?: ReactNode
  showSearch?: boolean
  searchPlaceholder?: string
}

export function RelayTopbar({
  breadcrumbs,
  subtitle,
  actions,
  showSearch = true,
  searchPlaceholder = 'Search…',
}: RelayTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="relay-topbar relay-topbar-full">
        <ModuleSwitcher />
        <div className="relay-bc">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="relay-bc-part">
              {i > 0 ? <span className="relay-bc-sep">/</span> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="relay-bc-link">
                  {crumb.label}
                </Link>
              ) : (
                <span className="relay-bc-cur">{crumb.label}</span>
              )}
            </span>
          ))}
          {subtitle ? (
            <>
              <span className="relay-bc-sep">·</span>
              <span className="relay-bc-sub">{subtitle}</span>
            </>
          ) : null}
        </div>
        <div className="relay-topbar-actions">
          {showSearch ? (
            <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
              <i className="ti ti-search" />
              <span style={{ flex: 1 }}>{searchPlaceholder}</span>
              <span className="kbd">⌘K</span>
            </button>
          ) : null}
          {actions}
        </div>
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
