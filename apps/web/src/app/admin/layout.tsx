import type { ReactNode } from 'react'
import { AdminShell } from '@/fresh/components/admin/AdminShell'
import { FreshProvider } from '@/fresh/data/FreshProvider'
import '@/fresh/styles/fresh.css'
import '@/fresh/styles/admin.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <FreshProvider>
      <AdminShell>{children}</AdminShell>
    </FreshProvider>
  )
}
