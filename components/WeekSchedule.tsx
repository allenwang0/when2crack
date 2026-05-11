'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

interface TimeSlot {
  day: string
  hour: number
  available: boolean
}

interface WeekScheduleProps {
  comparisonMode?: boolean
  comparisonName?: string
}

// Helper function to get Monday of a given date
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function WeekSchedule({ comparisonMode = false, comparisonName }: WeekScheduleProps) {
  const { user } = useAuth()
  const { toasts, showToast, removeToast } = useToast()
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i) // 0-23

  // Week selection state
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getMonday(new Date()))
  const weekKey = `week_schedule_${formatDate(selectedWeekStart)}`

  const [selectedSlotsArray, setSelectedSlotsArray] = useLocalStorage<string[]>(weekKey, [])
  const [selectedSlots, setSelectedSlotsState] = useState<Set<string>>(new Set(selectedSlotsArray))
  const [isDragging, setIsDragging] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  // For comparison mode - decode schedule from URL if present
  const [comparisonSlots, setComparisonSlots] = useState<Set<string>>(new Set<string>())
  const [comparisonTimezone, setComparisonTimezone] = useState<string>('')
  const [userTimezone, setUserTimezone] = useState<string>('')
  const [scheduleDecodeError, setScheduleDecodeError] = useState<string>('')

  // Get user's timezone on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { getUserTimezone } = require('@/lib/utils/timezone')
      setUserTimezone(getUserTimezone())
    }
  }, [])

  // Extract shared schedule from URL on mount
  useEffect(() => {
    if (comparisonMode && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const encodedSchedule = params.get('schedule')
      if (encodedSchedule) {
        setScheduleDecodeError('')
        try {
          // Try new timezone-aware format first
          const { decodeScheduleWithTimezone } = require('@/lib/utils/timezone')
          const { convertedSlots, originalTimezone } = decodeScheduleWithTimezone(encodedSchedule)
          setComparisonSlots(new Set(convertedSlots))
          setComparisonTimezone(originalTimezone)
        } catch (e) {
          // Fallback to old format (plain array)
          try {
            const decoded = JSON.parse(decodeURIComponent(encodedSchedule))
            if (Array.isArray(decoded)) {
              setComparisonSlots(new Set(decoded))
            } else {
              throw new Error('Invalid schedule format')
            }
          } catch (fallbackError) {
            console.error('Failed to decode shared schedule:', fallbackError)
            setScheduleDecodeError('Unable to load shared schedule. The link may be corrupted or expired.')
          }
        }
      }
    }
  }, [comparisonMode])

  const setSelectedSlots = (newSlots: Set<string>) => {
    setSelectedSlotsState(newSlots)
    setSelectedSlotsArray(Array.from(newSlots))

    // Show saved message briefly
    setShowSavedMessage(true)
    setTimeout(() => setShowSavedMessage(false), 1500)
  }

  // Week navigation functions
  const goToThisWeek = () => {
    setSelectedWeekStart(getMonday(new Date()))
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedWeekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setSelectedWeekStart(nextWeek)
  }

  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedWeekStart)
    prevWeek.setDate(prevWeek.getDate() - 7)
    setSelectedWeekStart(prevWeek)
  }

  // Update slots when week changes
  useEffect(() => {
    const newWeekKey = `week_schedule_${formatDate(selectedWeekStart)}`
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(newWeekKey)
        const storedSlots = stored ? JSON.parse(stored) : []
        setSelectedSlotsState(new Set(Array.isArray(storedSlots) ? storedSlots : []))
      } catch (error) {
        console.error('Error parsing stored schedule:', error)
        setSelectedSlotsState(new Set())
      }
    } else {
      setSelectedSlotsState(new Set())
    }
  }, [selectedWeekStart])

  // Format week display
  const getWeekDisplay = () => {
    const weekEnd = new Date(selectedWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${selectedWeekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`
  }

  const isThisWeek = formatDate(selectedWeekStart) === formatDate(getMonday(new Date()))

  // Memoize overlapping slots calculation
  const overlappingSlots = useMemo(() => {
    if (!comparisonMode) return []
    const overlaps: string[] = []
    selectedSlots.forEach(slot => {
      if (comparisonSlots.has(slot)) {
        overlaps.push(slot)
      }
    })
    return overlaps
  }, [comparisonMode, selectedSlots, comparisonSlots])

  // Memoize best time blocks calculation
  const bestBlocks = useMemo(() => {
    if (!comparisonMode || overlappingSlots.length === 0) return []

    // Sort by day and hour
    const sorted = [...overlappingSlots].sort((a, b) => {
      const [dayA, hourA] = a.split('-')
      const [dayB, hourB] = b.split('-')
      const dayIndexA = days.indexOf(dayA)
      const dayIndexB = days.indexOf(dayB)
      if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB
      return parseInt(hourA) - parseInt(hourB)
    })

    // Group consecutive hours on same day
    const blocks: Array<{ day: string; startHour: number; endHour: number; count: number }> = []
    let currentBlock: { day: string; startHour: number; endHour: number; count: number } | null = null

    sorted.forEach(slot => {
      const [day, hourStr] = slot.split('-')
      const hour = parseInt(hourStr)

      if (!currentBlock || currentBlock.day !== day || currentBlock.endHour !== hour) {
        // Start new block
        if (currentBlock) blocks.push(currentBlock)
        currentBlock = { day, startHour: hour, endHour: hour + 1, count: 1 }
      } else {
        // Extend current block
        currentBlock.endHour = hour + 1
        currentBlock.count++
      }
    })
    if (currentBlock) blocks.push(currentBlock)

    // Sort by count (longest blocks first)
    return blocks.sort((a, b) => b.count - a.count)
  }, [comparisonMode, overlappingSlots])

  const getSlotKey = useCallback((day: string, hour: number) => `${day}-${hour}`, [])

  const toggleSlot = useCallback((day: string, hour: number) => {
    const key = getSlotKey(day, hour)
    const newSlots = new Set(selectedSlots)

    if (newSlots.has(key)) {
      newSlots.delete(key)
    } else {
      newSlots.add(key)
    }

    setSelectedSlots(newSlots)
  }, [selectedSlots, setSelectedSlots, getSlotKey])

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am'
    if (hour < 12) return `${hour}am`
    if (hour === 12) return '12pm'
    return `${hour - 12}pm`
  }

  const handleSendScheduleBack = async () => {
    try {
      if (selectedSlots.size === 0) {
        showToast('Please mark some times as available first', 'error')
        return
      }

      // Encode user's schedule
      const { encodeScheduleWithTimezone } = require('@/lib/utils/timezone')
      const encodedSchedule = encodeScheduleWithTimezone(Array.from(selectedSlots))

      // Get display name
      const displayName = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('display_name') || '"Someone"')
        : 'Someone'

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
      const shareUrl = `${baseUrl}/schedule?for=${encodeURIComponent(displayName)}&schedule=${encodedSchedule}`

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      showToast(`Link copied! Send it to ${comparisonName || 'them'} to share your availability`, 'success')
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to generate response link:', err)
      }
      showToast('Failed to copy link. Please try again.', 'error')
    }
  }

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-6 shadow-lg border-[3px] border-yellow-bright schedule-grid">
      {/* Header */}
      <div className="mb-4 sm:mb-6 text-center">
        <div className="inline-block bg-black text-yellow-bright px-4 sm:px-6 py-2 rounded-full mb-3">
          <span className="font-bold text-base sm:text-lg">📅 This Week's Availability</span>
        </div>

        {/* Week Picker - Only show when NOT in comparison mode */}
        {!comparisonMode && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="min-w-[180px] text-center">
              <p className="font-semibold text-foreground">{getWeekDisplay()}</p>
              {!isThisWeek && (
                <button
                  onClick={goToThisWeek}
                  className="text-xs text-pink hover:underline"
                >
                  Jump to this week
                </button>
              )}
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Next week"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Tap times when you're free to hang
        </p>

        {/* Schedule Decode Error */}
        {scheduleDecodeError && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-600 font-medium">{scheduleDecodeError}</p>
          </div>
        )}
        {userTimezone && (
          <div className="mt-2 text-xs text-gray-500">
            {comparisonMode && comparisonTimezone && comparisonTimezone !== userTimezone ? (
              <>
                <span className="font-medium">Your timezone:</span> {userTimezone}
                {' • '}
                <span className="font-medium">{comparisonName || 'Their'} timezone:</span> {comparisonTimezone}
                {' • '}
                <span className="text-teal">✓ Times converted</span>
              </>
            ) : (
              <>
                <span className="font-medium">Timezone:</span> {userTimezone}
              </>
            )}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex">
        {/* Time labels column - fixed */}
        <div className="flex-shrink-0">
          {/* Empty space for header alignment */}
          <div className="w-16 py-2 h-[42px]"></div>
          {/* Time labels - 8pm through 4am */}
          <div className="space-y-1">
            {[20, 21, 22, 23, 0, 1, 2, 3, 4].map(hour => (
              <div key={hour} className="w-16 text-xs text-gray-500 text-right pr-2 h-11 flex items-center justify-end">
                {formatHour(hour)}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable calendar grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Days header */}
            <div className="flex">
              {days.map(day => (
                <div
                  key={day}
                  className="flex-1 text-center font-bold py-2 min-w-[60px] text-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time slots - 8pm through 4am */}
            <div className="space-y-1">
              {[20, 21, 22, 23, 0, 1, 2, 3, 4].map(hour => (
                <div key={hour} className="flex items-center">
                  {days.map(day => {
                    const key = getSlotKey(day, hour)
                    const isSelected = selectedSlots.has(key)

                    const isComparison = comparisonSlots.has(key)
                    const isOverlap = comparisonMode && isSelected && isComparison

                    return (
                      <button
                        key={key}
                        onMouseEnter={() => isDragging && toggleSlot(day, hour)}
                        onMouseDown={() => {
                          setIsDragging(true)
                          toggleSlot(day, hour)
                        }}
                        onMouseUp={() => setIsDragging(false)}
                        onTouchStart={() => {
                          toggleSlot(day, hour)
                        }}
                        className={`flex-1 h-11 min-w-[60px] transition-all rounded-lg mx-0.5 touch-manipulation ${
                          isOverlap
                            ? 'bg-teal border-2 border-teal-dark'
                            : isSelected
                            ? 'bg-yellow-bright border-2 border-foreground'
                            : isComparison
                            ? 'bg-pink border-2 border-foreground'
                            : 'bg-background border border-gray-200'
                        } cursor-pointer active:scale-95`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm flex-wrap">
        {comparisonMode ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-bright border-2 border-foreground" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-pink border-2 border-foreground" />
              <span>{comparisonName || 'Them'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal border-2 border-teal-dark" />
              <span>Both Free!</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-bright border-2 border-foreground" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-background border border-gray-200" />
              <span>Unavailable</span>
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 text-center space-y-3">
        {comparisonMode && overlappingSlots.length > 0 ? (
          <>
            <div className="inline-block bg-teal text-white rounded-2xl px-6 py-3">
              <span className="font-bold">
                🎉 {overlappingSlots.length} hour{overlappingSlots.length !== 1 ? 's' : ''} of mutual free time!
              </span>
            </div>
            {/* Best time suggestions */}
            {bestBlocks.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">✨ Best times to meet:</p>
                {bestBlocks.slice(0, 3).map((block, idx) => (
                  <div key={idx} className="inline-block bg-white border-2 border-teal rounded-xl px-4 py-2 mx-1">
                    <span className="font-semibold text-foreground">
                      {block.day} {formatHour(block.startHour)}-{formatHour(block.endHour)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({block.count}hr{block.count !== 1 ? 's' : ''})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : comparisonMode ? (
          <div className="inline-block bg-gray-200 text-gray-600 rounded-2xl px-6 py-3">
            <span className="font-bold">
              No overlapping availability yet
            </span>
          </div>
        ) : (
          <div className="inline-block bg-yellow-soft rounded-2xl px-6 py-3">
            <span className="font-bold text-black">
              {selectedSlots.size} hours marked as available
            </span>
          </div>
        )}

        {showSavedMessage && !comparisonMode && (
          <div className="inline-block bg-teal text-white px-4 py-2 rounded-full text-sm font-semibold">
            ✓ Saved!
          </div>
        )}

        {!user && !comparisonMode && (
          <div className="text-xs text-gray-500 max-w-sm mx-auto">
            Note: Your schedule is saved locally. Sign in to sync across devices.
          </div>
        )}

        {/* Send Schedule Back Button - Only in comparison mode */}
        {comparisonMode && (
          <div className="mt-4">
            <button
              onClick={handleSendScheduleBack}
              className="bg-gradient-to-r from-pink to-purple text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              📤 Send Your Schedule to {comparisonName || 'Them'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Share your availability so {comparisonName || 'they'} can see when you're both free
            </p>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
