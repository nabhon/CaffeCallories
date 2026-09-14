import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Authentication Error</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            We were unable to sign you in. The verification link or session may have expired.
          </p>
        </div>
        <Link href="/login" className="block w-full">
          <Button className="w-full h-10">Back to Login</Button>
        </Link>
      </div>
    </div>
  )
}
