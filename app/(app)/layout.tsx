'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { HelpFAQ } from '@/components/HelpFAQ'
import { OnboardingController } from '@/components/Onboarding'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleSignOut = async () => {
    // For authenticated users, show confirmation if they have guest data
    if (user) {
      const hasGuestData = localStorage.getItem('guest_roster')
      if (hasGuestData) {
        setShowLogoutConfirm(true)
        return
      }
    }

    // Proceed with sign out
    setSigningOut(true)
    await signOut()
  }

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false)
    setSigningOut(true)
    await signOut()
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <OnboardingController>
      <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Header - fixed */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b z-40" style={{ borderColor: '#F5F5F0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="max-w-md mx-auto flex items-center justify-between h-16 px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="/icon.jpg"
              alt="When2Crack"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
              style={{ border: '2px solid #FFD93D' }}
            />
            <h1 className="font-serif text-base sm:text-lg font-bold truncate" style={{ color: '#1A1A1A' }}>
              when2crack<span className="hidden sm:inline">: organize your roster</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-2 rounded-full hover:bg-pink/10 transition-colors disabled:opacity-50"
                title="Sign Out"
                style={{ color: '#FFB6D9' }}
              >
                <svg
                  className="w-6 h-6"
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
                className="px-4 py-2 text-sm font-semibold text-white rounded-full transition-all shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FFB6D9 0%, #E4C1F9 100%)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content - scrollable with padding for fixed header and nav */}
      <main className="flex-1 overflow-y-auto pt-16 pb-20">
        <div className="max-w-md mx-auto w-full px-4">
          {children}
        </div>
      </main>

      {/* Bottom navigation - now rendered via fixed positioning in Navigation component */}
      <Navigation />

      {/* Help FAQ - persistent */}
      <HelpFAQ />

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-foreground mb-3">Sign Out?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your local guest data will remain on this device, but you'll need to sign in again to sync across devices.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-full border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  disabled={signingOut}
                  className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink to-purple text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OnboardingController>
  )
}
