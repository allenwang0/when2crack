'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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

  useEffect(() => {
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth loading timeout - proceeding without auth')
      setLoading(false)
    }, 3000) // 3 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Session error:', error)
        }
        setUser(session?.user ?? null)
        setLoading(false)
        clearTimeout(timeout)
      })
      .catch((error) => {
        console.error('Auth error:', error)
        setLoading(false)
        clearTimeout(timeout)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'User:', session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)

      // Create user profile on sign in if it doesn't exist
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // @ts-ignore
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single()

          // If user doesn't exist (PGRST116 is "not found" error), create them
          if (fetchError && fetchError.code === 'PGRST116') {
            // @ts-ignore
            const { error: insertError } = await supabase.from('users').insert({
              id: session.user.id,
              email: session.user.email!,
            })

            if (insertError) {
              console.error('Error inserting user profile:', insertError)
            } else {
              console.log('User profile created successfully')
            }
          }
        } catch (err) {
          console.error('Error creating user profile:', err)
        }
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      console.log('Signing out...')
      await supabase.auth.signOut()
      setUser(null)

      // Clear any local storage (except guest data)
      const guestRoster = localStorage.getItem('guest_roster')
      localStorage.clear()
      if (guestRoster) {
        localStorage.setItem('guest_roster', guestRoster)
      }

      // Force redirect to home page
      if (typeof window !== 'undefined') {
        window.location.replace('/')
      }
    } catch (error) {
      console.error('Sign out error:', error)
      // Force redirect even if there's an error
      if (typeof window !== 'undefined') {
        window.location.replace('/')
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
