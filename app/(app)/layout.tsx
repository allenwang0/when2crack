'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { HelpFAQ } from '@/components/HelpFAQ'
import { OnboardingController } from '@/components/Onboarding'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/lib/hooks/useTheme'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showFAQ, setShowFAQ] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)

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
      <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-40" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }} role="banner">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="/icon.jpg"
              alt="When2Crack logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
              style={{ border: '2px solid #FFD93D' }}
            />
            <h1 className="font-serif text-base sm:text-lg font-bold truncate text-gray-900 dark:text-gray-100">
              when2crack
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Theme"
                aria-label="Change theme"
                style={{ color: '#C4B5FD' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                  {resolvedTheme === 'dark' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  )}
                </svg>
              </button>
              {showThemeMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
                    <button
                      onClick={() => {
                        setTheme('light')
                        setShowThemeMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-xl text-sm transition-colors ${
                        theme === 'light' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                      }`}
                    >
                      ☀️ Light
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark')
                        setShowThemeMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors ${
                        theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                      }`}
                    >
                      🌙 Dark
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system')
                        setShowThemeMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-xl text-sm transition-colors ${
                        theme === 'system' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                      }`}
                    >
                      💻 System
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowFAQ(true)}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Guide"
              aria-label="Open guide"
              style={{ color: '#C4B5FD' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-3 rounded-full hover:bg-pink/10 transition-colors disabled:opacity-50"
                title="Sign Out"
                aria-label={signingOut ? 'Signing out' : 'Sign out of your account'}
                style={{ color: '#FFB6D9' }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                aria-label="Sign in to your account"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content - scrollable with padding for fixed header and nav */}
      <main className="flex-1 overflow-y-auto pt-16 pb-28" role="main" aria-label="Main content">
        <div className="max-w-md mx-auto w-full px-4">
          {children}
        </div>
      </main>

      {/* Bottom navigation - now rendered via fixed positioning in Navigation component */}
      <Navigation />

      {/* Help FAQ - controlled by header button */}
      <HelpFAQ isOpen={showFAQ} onClose={() => setShowFAQ(false)} />

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 id="logout-dialog-title" className="text-xl font-bold text-foreground dark:text-gray-100 mb-3">Sign Out?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Your local guest data will remain on this device, but you'll need to sign in again to sync across devices.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-full border-2 border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Cancel sign out"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  disabled={signingOut}
                  className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink to-purple text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  aria-label={signingOut ? 'Signing out, please wait' : 'Confirm sign out'}
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
