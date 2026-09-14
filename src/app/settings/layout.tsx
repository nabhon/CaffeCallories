import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings | Callories',
  description: 'Adjust your personal biometrics, activity levels, and daily calorie & macro targets.',
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
