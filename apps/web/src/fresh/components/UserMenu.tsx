'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

/**
 * Minimal sign-out affordance — mirrors ProjectSwitcher.tsx's
 * popover-open/close pattern (outside-click-to-close ref + effect).
 */
export function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!session?.user) return null

  return (
    <div className="proj-switcher" ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="proj-btn" onClick={() => setOpen((v) => !v)}>
        <i className="ti ti-user-circle" style={{ fontSize: 15, color: 'var(--text3)' }} />
        <span className="pn">{session.user.name}</span>
        <i className="ti ti-chevron-down" />
      </button>
      {open ? (
        <div className="proj-dd open" style={{ right: 0, left: 'auto' }}>
          <div className="proj-dd-hd">{session.user.name}</div>
          <div style={{ padding: '4px 12px 10px', fontSize: 12, color: 'var(--text3)' }}>
            {session.user.email}
            <br />
            {(session.user as { globalRole?: string }).globalRole}
          </div>
          <div className="proj-divider" />
          <button
            type="button"
            className="proj-action"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <i className="ti ti-logout" />
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  )
}
