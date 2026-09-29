import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aether Relay',
  description: 'Control bridge for Android mirroring and desktop performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
