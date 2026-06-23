'use client'

import { useState, type ReactNode } from 'react'

export function PermissionGate({
  allowed,
  message,
  children,
}: {
  allowed: boolean
  message: string
  children: ReactNode
}) {
  const [notice, setNotice] = useState('')

  if (allowed) return <>{children}</>

  return (
    <span className="admin-perm-gate">
      <span
        role="button"
        tabIndex={0}
        className="admin-perm-blocked"
        onClick={() => {
          setNotice(message)
          window.setTimeout(() => setNotice(''), 4000)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setNotice(message)
            window.setTimeout(() => setNotice(''), 4000)
          }
        }}
      >
        {children}
      </span>
      {notice ? <span className="admin-perm-msg">{notice}</span> : null}
    </span>
  )
}

export function PermissionButton({
  allowed,
  message,
  className,
  onClick,
  children,
  disabled,
}: {
  allowed: boolean
  message: string
  className?: string
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
}) {
  const [notice, setNotice] = useState('')

  function handleClick() {
    if (!allowed) {
      setNotice(message)
      window.setTimeout(() => setNotice(''), 4000)
      return
    }
    onClick?.()
  }

  return (
    <span className="admin-perm-gate">
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-disabled={!allowed || disabled}
        onClick={handleClick}
      >
        {children}
      </button>
      {notice ? <span className="admin-perm-msg">{notice}</span> : null}
    </span>
  )
}
