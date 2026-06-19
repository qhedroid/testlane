import type { ReactNode } from 'react'

interface AdminPageShellProps {
  title: string
  children: ReactNode
}

export function AdminPageShell({ title, children }: AdminPageShellProps) {
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">{title}</h1>
      {children}
    </div>
  )
}
