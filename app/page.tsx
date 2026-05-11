'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  // Auto-redirect authenticated users to roster
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/roster')
    }
  }, [user, authLoading, router])

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        },
      })

      if (error) {
        console.error('Google Sign-In error:', error)
        throw error
      }
      // Google will handle the redirect
    } catch (err: unknown) {
      console.error('Auth error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String((err as any).message))
      } else {
        setError('An unexpected error occurred. Check console for details.')
      }
      setLoading(false)
    }
  }

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Big Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src="/icon.jpg"
              alt="When2Crack"
              className="w-32 h-32 rounded-full shadow-2xl"
              style={{ border: '4px solid #FFD93D' }}
            />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
            When2Crack
          </h1>
          <p className="text-foreground/70">Your roster, ranked. Your night, decided.</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleSignIn}
            variant="secondary"
            className="w-full flex items-center justify-center gap-3 py-3"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-background text-gray-400">or</span>
            </div>
          </div>

          <Button
            onClick={() => router.push('/roster')}
            className="w-full py-3 bg-[#FF8C69] hover:bg-[#FF7A58]"
          >
            Try as Guest
          </Button>

          <p className="text-xs text-center text-gray-400 mt-2">
            Guest mode: Data saved locally, sign in with Google to sync across devices
          </p>
        </div>
      </div>
    </div>
  )
}
