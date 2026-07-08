import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-open-sans',
})

export const metadata: Metadata = {
  title: 'Relay — QA Workspace',
  description: 'Relay — internal QA test management and execution workspace',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={openSans.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body className={openSans.className}>{children}</body>
    </html>
  )
}
