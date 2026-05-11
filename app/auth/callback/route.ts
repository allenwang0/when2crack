import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Error exchanging code for session:', error)
        // Redirect to home page with error
        return NextResponse.redirect(`${origin}/?error=auth_error`)
      }
    } catch (err) {
      console.error('Unexpected error during auth callback:', err)
      return NextResponse.redirect(`${origin}/?error=auth_error`)
    }
  }

  // Redirect to roster page after successful authentication
  return NextResponse.redirect(`${origin}/roster`)
}
