import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(`${origin}/?error=auth_error`)
  }

  if (code) {
    const supabase = await createClient()

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/?error=auth_error`)
      }

      if (data.session) {
        console.log('Successfully authenticated user:', data.user?.email)
        // Redirect to roster page after successful authentication
        return NextResponse.redirect(`${origin}/roster`)
      }
    } catch (err) {
      console.error('Unexpected error during auth callback:', err)
      return NextResponse.redirect(`${origin}/?error=auth_error`)
    }
  }

  // No code provided, redirect to home
  console.warn('Auth callback called without code')
  return NextResponse.redirect(`${origin}/`)
}
