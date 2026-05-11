'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Track user creation attempts to prevent duplicates
  const userCreationAttempts = useRef<Set<string>>(new Set())

  // Centralized user profile creation function
  const ensureUserProfile = useCallback(async (userId: string, email: string) => {
    // Prevent duplicate attempts for the same user
    if (userCreationAttempts.current.has(userId)) {
      return
    }

    userCreationAttempts.current.add(userId)

    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()

      // If user doesn't exist (PGRST116 is "not found" error), create them
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          email: email,
        } as any)

        if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
          logger.error('Error inserting user profile:', insertError)
        }
      }
    } catch (err) {
      logger.error('Error ensuring user profile:', err)
    } finally {
      // Allow retry after 5 seconds if needed
      setTimeout(() => {
        userCreationAttempts.current.delete(userId)
      }, 5000)
    }
  }, [supabase])

  useEffect(() => {
    let isSubscribed = true

    // Safety timeout to prevent infinite loading (5 seconds, increased from 3)
    const timeout = setTimeout(() => {
      if (isSubscribed && loading) {
        logger.warn('Auth initialization timeout - proceeding with fallback')
        setLoading(false)
      }
    }, 5000)

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          logger.error('Session error:', error)
        }

        if (isSubscribed) {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          setLoading(false)
          clearTimeout(timeout)

          // Ensure user profile exists
          if (currentUser?.id && currentUser?.email) {
            ensureUserProfile(currentUser.id, currentUser.email)
          }
        }
      } catch (error) {
        logger.error('Auth error:', error)
        if (isSubscribed) {
          setUser(null)
          setLoading(false)
          clearTimeout(timeout)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (isSubscribed) {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)

        // Ensure user profile exists on sign in
        if (event === 'SIGNED_IN' && currentUser?.id && currentUser?.email) {
          ensureUserProfile(currentUser.id, currentUser.email)
        }
      }
    })

    return () => {
      isSubscribed = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase, ensureUserProfile, loading])

  const signOut = async () => {
    try {
      logger.auth('Signing out')

      // Clear any local storage (except guest data) FIRST
      const guestRoster = localStorage.getItem('guest_roster')
      const guestSchedule = localStorage.getItem('week_schedule')
      const displayName = localStorage.getItem('display_name')

      localStorage.clear()

      // Restore guest data
      if (guestRoster) localStorage.setItem('guest_roster', guestRoster)
      if (guestSchedule) localStorage.setItem('week_schedule', guestSchedule)
      if (displayName) localStorage.setItem('display_name', displayName)

      // Sign out from Supabase and wait for it to complete
      await supabase.auth.signOut({ scope: 'local' })

      // Update state
      setUser(null)

      // Small delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 100))

      // Force redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      logger.error('Sign out error:', error)
      // Clear user and redirect even if there's an error
      setUser(null)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
