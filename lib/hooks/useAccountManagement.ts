import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'

export function useAccountManagement() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Export all user data as JSON file
   */
  const exportData = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to export data')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/export')
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `when2crack-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Get account deletion info
   */
  const getDeletionInfo = useCallback(async () => {
    if (!user) {
      setError('You must be logged in')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/delete')
      if (!response.ok) {
        throw new Error('Failed to fetch account info')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch info')
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Delete user account permanently
   * Requires explicit confirmation string
   */
  const deleteAccount = useCallback(
    async (confirmation: string) => {
      if (!user) {
        setError('You must be logged in to delete your account')
        return false
      }

      if (confirmation !== 'DELETE_MY_ACCOUNT') {
        setError('Invalid confirmation')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/user/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete account')
        }

        // Account deleted successfully - will be logged out automatically
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete account')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  return {
    loading,
    error,
    exportData,
    getDeletionInfo,
    deleteAccount,
  }
}
