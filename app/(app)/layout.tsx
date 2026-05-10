'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { PanicButton } from '@/components/PanicButton'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

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
      <header className="sticky top-0 bg-background border-b border-border z-40">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <h1 className="font-serif text-xl font-bold text-pink">When2Crack</h1>
          <div className="flex items-center gap-2">
            {user && <PanicButton />}
            {user ? (
              <button
                onClick={signOut}
                className="p-2 rounded-lg hover:bg-card transition-colors"
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
                className="px-3 py-1.5 text-sm bg-pink text-white rounded-lg hover:bg-pink/90 transition-colors"
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
