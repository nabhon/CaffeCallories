import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Compute effective origin for localhost vs production reverse proxy
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const effectiveOrigin = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, height_cm')
        .eq('id', data.user.id)
        .maybeSingle()

      // If profile is missing or height is null, redirect to onboarding
      if (!profile || !profile.height_cm) {
        return NextResponse.redirect(`${effectiveOrigin}/onboarding`)
      }

      return NextResponse.redirect(`${effectiveOrigin}${next}`)
    }
  }

  return NextResponse.redirect(`${effectiveOrigin}/login?error=auth_failed`)
}

