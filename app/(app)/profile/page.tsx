'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useOnboarding } from '@/lib/contexts/OnboardingContext'
import { GuestBanner } from '@/components/GuestBanner'
import { Achievements } from '@/components/Achievements'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { calculateAchievements } from '@/lib/utils/achievements'
import { isValidAvatarUrl, DEFAULT_PROFILE_PIC } from '@/lib/utils/avatar'
import type { RosterPerson } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { startTour, nextStep } = useOnboarding()
  const supabase = createClient()
  const { toasts, showToast, removeToast } = useToast()
  const [localRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles] = useLocalStorage<string[]>('completed_battles', [])
  const [weekSchedule] = useLocalStorage<string[]>('week_schedule', [])
  const [displayName, setDisplayName] = useLocalStorage<string>('display_name', '')
  const [userAvatar, setUserAvatar] = useLocalStorage<string | null>('user_avatar', null)

  const [roster, setRoster] = useState<RosterPerson[]>([])
  const [totalHangs, setTotalHangs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error')
      return
    }

    try {
      // Compress and resize image
      const { compressImage } = await import('@/lib/utils/imageCompression')
      const compressedBase64 = await compressImage(file)
      setAvatarUrl(compressedBase64)

      // Save immediately
      if (!user) {
        // Guest mode: Update localStorage
        setUserAvatar(compressedBase64)
      } else {
        // Authenticated mode: Update Supabase
        const { error } = await (supabase
          .from('users') as any)
          .update({ avatar_url: compressedBase64 })
          .eq('id', user.id)

        if (error) {
          console.error('Error updating avatar:', error)
          showToast('Failed to update photo', 'error')
          return
        }
      }

      showToast('Profile photo updated!', 'success')
    } catch (err) {
      console.error('Image compression error:', err)
      showToast('Failed to process image. Please try another.', 'error')
    }
  }

  const handleRemovePhoto = async () => {
    setAvatarUrl(null)

    if (!user) {
      // Guest mode: Update localStorage
      setUserAvatar(null)
    } else {
      // Authenticated mode: Update Supabase
      const { error } = await (supabase
        .from('users') as any)
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (error) {
        console.error('Error removing avatar:', error)
        showToast('Failed to remove photo', 'error')
        // Restore the avatar in UI
        setAvatarUrl(userAvatar)
        return
      }
    }

    showToast('Photo removed', 'success')
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setRoster(localRoster)
        setAvatarUrl(userAvatar)
        setLoading(false)
        return
      }

      try {
        // Run all queries in parallel for faster loading
        const [rosterResult, hangsResult, userResult] = await Promise.all([
          supabase
            .from('roster')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'Archived'),
          // Use count instead of fetching all records for better performance
          supabase
            .from('hangs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('users')
            .select('avatar_url')
            .eq('id', user.id)
            .single()
        ])

        if (rosterResult.data) {
          setRoster(rosterResult.data as RosterPerson[])
        }

        if (hangsResult.count !== null) {
          setTotalHangs(hangsResult.count)
        }

        if ((userResult as any).data) {
          setAvatarUrl((userResult as any).data.avatar_url)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching stats:', error)
        setLoading(false)
      }
    }

    fetchStats()
    // supabase is now a singleton, no need to track as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, localRoster, userAvatar])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleSaveName = () => {
    setDisplayName(tempName)
    setIsEditingName(false)
  }

  const handleEditName = () => {
    setTempName(displayName)
    setIsEditingName(true)
  }

  // Calculate stats
  const totalPeople = roster.length
  const totalBattles = user ? 0 : completedBattles.length
  const topTierCount = roster.filter(p => p.tier === 'S').length
  const avgCompositeScore = roster.length > 0
    ? Math.round(roster.reduce((acc, p) => acc + (p.attraction_score + p.personality_score + p.reliability_score) / 3, 0) / roster.length)
    : 0

  const achievements = calculateAchievements(
    totalPeople,
    completedBattles.length,
    weekSchedule.length > 0,
    0
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink"></div>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="py-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {!user && !authLoading && <GuestBanner />}

      {/* Header */}
      <div className="text-center mb-8">
        {/* DEBUG INFO */}
        <div className="mb-4 p-4 bg-yellow-100 border-2 border-yellow-500 rounded text-xs text-left">
          <div><strong>Avatar Debug:</strong></div>
          <div>avatarUrl: {avatarUrl || 'null'}</div>
          <div>isValid: {isValidAvatarUrl(avatarUrl) ? 'YES' : 'NO'}</div>
          <div>Will show: {isValidAvatarUrl(avatarUrl) ? 'UPLOADED IMAGE' : 'EGG.PNG'}</div>
          {avatarUrl && <div>First 50 chars: {avatarUrl.substring(0, 50)}...</div>}
        </div>

        <div className="relative inline-block group">
          {/* FORCE VISIBLE BACKGROUND */}
          <div style={{
            width: '96px',
            height: '96px',
            background: 'linear-gradient(135deg, #ffc0cb 0%, #dda0dd 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #ff1493',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <img
              src={isValidAvatarUrl(avatarUrl) ? avatarUrl! : '/egg.png'}
              alt="Profile"
              style={{
                width: isValidAvatarUrl(avatarUrl) ? '100%' : '80px',
                height: isValidAvatarUrl(avatarUrl) ? '100%' : '80px',
                objectFit: isValidAvatarUrl(avatarUrl) ? 'cover' : 'contain',
                position: 'relative',
                zIndex: 10
              }}
              onError={(e) => {
                console.error('❌ Image failed to load:', e.currentTarget.src)
                alert('IMAGE FAILED: ' + e.currentTarget.src.substring(0, 100))
                e.currentTarget.src = '/egg.png'
                e.currentTarget.style.width = '80px'
                e.currentTarget.style.height = '80px'
                e.currentTarget.style.objectFit = 'contain'
              }}
              onLoad={(e) => {
                console.log('✅ Image loaded:', e.currentTarget.src.substring(0, 50))
              }}
            />
          </div>

          {/* Photo upload overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition-all duration-200 flex items-center justify-center">
            <label htmlFor="avatar-upload" className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white rounded-full p-2 shadow-lg">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Remove photo button */}
          {avatarUrl && avatarUrl.trim() !== '' && (
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isEditingName ? (
          <div className="max-w-xs mx-auto mb-4">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your name"
              className="text-center text-xl font-bold mb-2"
            />
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setIsEditingName(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <h1 className="text-3xl font-serif font-bold">
                {displayName || (user ? user.email?.split('@')[0] : 'Guest User')}
              </h1>
              <button
                onClick={handleEditName}
                className="text-gray-600 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {user ? user.email : 'Browsing in guest mode'}
            </p>
          </>
        )}
      </div>

      {/* Statistics Section */}
      <h3 className="text-lg font-bold text-gray-900 mb-4 mt-6">Statistics</h3>
      <div className="grid grid-cols-2 gap-3 mb-6 profile-stats">
        <div className="bg-white border-2 border-pink/20 rounded-2xl p-5 text-center hover:border-pink/40 transition-colors">
          <div className="text-4xl font-bold text-pink mb-3">{totalPeople}</div>
          <div className="text-sm font-medium text-gray-600">Total People</div>
        </div>
        <div className="bg-white border-2 border-purple/20 rounded-2xl p-5 text-center hover:border-purple/40 transition-colors">
          <div className="text-4xl font-bold text-purple mb-3">{topTierCount}</div>
          <div className="text-sm font-medium text-gray-600">S-Tier</div>
        </div>
        {!user && (
          <div className="bg-white border-2 border-teal/20 rounded-2xl p-5 text-center hover:border-teal/40 transition-colors">
            <div className="text-4xl font-bold text-teal mb-3">{totalBattles}</div>
            <div className="text-sm font-medium text-gray-600">Battles</div>
          </div>
        )}
        {user && (
          <div className="bg-white border-2 border-teal/20 rounded-2xl p-5 text-center hover:border-teal/40 transition-colors">
            <div className="text-4xl font-bold text-teal mb-3">{totalHangs}</div>
            <div className="text-sm font-medium text-gray-600">Total Hangs</div>
          </div>
        )}
        <div className="bg-white border-2 border-amber/20 rounded-2xl p-5 text-center hover:border-amber/40 transition-colors">
          <div className="text-4xl font-bold text-amber mb-3">{avgCompositeScore}</div>
          <div className="text-sm font-medium text-gray-600">Avg Score</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={() => router.push('/schedule')}
            className="w-full justify-start text-left"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold">Set My Schedule</div>
              <div className="text-xs opacity-90">Mark when you're free to hang</div>
            </div>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/roster')}
            className="w-full justify-start text-left"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <div className="font-semibold">View Roster</div>
              <div className="text-xs text-gray-600">See all your people</div>
            </div>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/add')}
            className="w-full justify-start text-left"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <div>
              <div className="font-semibold">Add Person</div>
              <div className="text-xs text-gray-600">Add someone new to your roster</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Achievements Section */}
      <h3 className="text-lg font-bold text-gray-900 mb-4">Achievements</h3>
      <div className="mb-6">
        <Achievements achievements={achievements} />
      </div>

      {/* Restart Tour Button */}
      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => {
            localStorage.removeItem('onboarding_seen')
            localStorage.removeItem('onboarding_completed')
            localStorage.removeItem('onboarding_skipped')
            startTour()
            nextStep() // Move to step 1 to start the tour
            router.push('/roster')
          }}
          className="w-full"
        >
          🎓 Restart App Tour
        </Button>
      </div>

      {/* Sign Out Button */}
      {user && (
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={handleSignOut}
            className="w-full text-red-500 hover:bg-red-50 border-red-300 hover:border-red-400"
          >
            Sign Out
          </Button>
        </div>
      )}

      {/* Sign In CTA for Guest */}
      {!user && !authLoading && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink rounded-2xl p-6 text-center shadow-sm">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="font-bold text-xl mb-2 text-gray-800">Unlock Full Features</h3>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Sign in to sync your data across devices, log hangs, and track your progress!
          </p>
          <Button onClick={() => router.push('/')}>
            Sign In
          </Button>
        </div>
      )}
    </div>
  )
}
