'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { formatAdminUserName } from '@/fresh/data/admin-initial-settings'

export function ActorSwitcher() {
  const { adminSettings, currentActor, setCurrentActor } = useFresh()
  const [open, setOpen] = useState(false)

  const selectable = adminSettings.users.filter((u) => u.status !== 'Disabled')

  return (
    <div className="admin-actor-wrap">
      <button
        type="button"
        className="admin-actor-btn"
        onClick={() => setOpen((v) => !v)}
        title="Switch demo actor (frontend RBAC)"
      >
        <span className="admin-actor-label">Demo role:</span>
        <span className="admin-actor-name">{formatAdminUserName(currentActor)}</span>
        <span className="admin-actor-role">({currentActor.role})</span>
        <ChevronDown size={14} />
      </button>
      {open ? (
        <>
          <div className="admin-actor-backdrop" onClick={() => setOpen(false)} />
          <div className="admin-actor-menu">
            {selectable.map((u) => (
              <button
                key={u.id}
                type="button"
                className={`admin-actor-item${u.id === currentActor.id ? ' on' : ''}`}
                onClick={() => {
                  setCurrentActor(u.id)
                  setOpen(false)
                }}
              >
                <span>{formatAdminUserName(u)}</span>
                <span className="admin-actor-item-role">{u.role}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
