import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendar Callories',
  description: 'View your monthly calorie budget history, daily net intake, and workout logs.',
}

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
