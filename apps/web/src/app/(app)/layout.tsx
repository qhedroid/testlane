import type { ReactNode } from 'react'
import { GlobalModals } from '@/fresh/components/GlobalModals'
import { FreshShell } from '@/fresh/components/FreshShell'
import { FreshProvider } from '@/fresh/data/FreshProvider'
import { FreshUIProvider } from '@/fresh/hooks/useFreshUI'
import '@/fresh/styles/fresh.css'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FreshProvider>
      <FreshUIProvider>
        <FreshShell>{children}</FreshShell>
        <GlobalModals />
      </FreshUIProvider>
    </FreshProvider>
  )
}
