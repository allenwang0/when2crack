'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { GuestData } from '@/lib/utils/guestMigration'
import { prepareRosterForMigration, clearGuestData, getMigrationStats } from '@/lib/utils/guestMigration'

interface GuestMigrationModalProps {
  guestData: GuestData
  userId: string
  onComplete: () => void
  onSkip: () => void
}

export function GuestMigrationModal({
  guestData,
  userId,
  onComplete,
  onSkip,
}: GuestMigrationModalProps) {
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const stats = getMigrationStats(guestData)
  const supabase = createClient()

  const handleMigrate = async () => {
    setMigrating(true)
    setError(null)
    setProgress(0)

    try {
      // Prepare roster data
      const rosterToMigrate = prepareRosterForMigration(guestData.roster, userId)

      // Insert roster data in batches
      const BATCH_SIZE = 10
      for (let i = 0; i < rosterToMigrate.length; i += BATCH_SIZE) {
        const batch = rosterToMigrate.slice(i, i + BATCH_SIZE)

        const { error: insertError } = await supabase
          .from('roster')
          .insert(batch as any)

        if (insertError) {
          throw new Error(`Failed to migrate roster: ${insertError.message}`)
        }

        setProgress(Math.floor(((i + batch.length) / rosterToMigrate.length) * 100))
      }

      // Clear guest data after successful migration
      clearGuestData()

      // Complete
      setProgress(100)
      setTimeout(() => {
        onComplete()
      }, 500)
    } catch (err: any) {
      console.error('Migration error:', err)
      setError(err.message || 'Failed to migrate data. Please try again.')
      setMigrating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-gray-600">
            We found your guest data. Would you like to transfer it to your account?
          </p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-2">What will be transferred:</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>✓ {stats.peopleCount} {stats.peopleCount === 1 ? 'person' : 'people'} in your roster</li>
            <li>✓ {stats.battlesCount} battle {stats.battlesCount === 1 ? 'comparison' : 'comparisons'}</li>
            <li>✓ All ELO ratings and scores</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Estimated time: {stats.estimatedTime}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {migrating && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Migrating data...</span>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-pink h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            className="flex-1"
          >
            {migrating ? 'Migrating...' : 'Transfer Data'}
          </Button>
          <Button
            onClick={onSkip}
            disabled={migrating}
            variant="secondary"
          >
            Skip
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          If you skip, your guest data will remain in your browser and won't be synced.
        </p>
      </div>
    </div>
  )
}
