'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { PanicButton } from '@/components/PanicButton'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
    // Force redirect regardless
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-card border-b border-border z-40">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="font-serif text-xl font-bold" style={{ color: '#FF8C69' }}>When2Crack</h1>
          <div className="flex items-center gap-2">
            {user && <PanicButton />}
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-2 rounded-lg hover:bg-card transition-colors disabled:opacity-50"
                title="Sign Out"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#FF8C69' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-md mx-auto w-full pb-20 px-4">{children}</main>

      {/* Bottom navigation */}
      <Navigation />
    </div>
  )
}
