'use client'

import { useState, useEffect } from 'react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useAuth } from '@/lib/contexts/AuthContext'

interface TimeSlot {
  day: string
  hour: number
  available: boolean
}

interface WeekScheduleProps {
  comparisonMode?: boolean
  comparisonName?: string
}

export function WeekSchedule({ comparisonMode = false, comparisonName }: WeekScheduleProps) {
  const { user } = useAuth()
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i) // 0-23

  const [selectedSlotsArray, setSelectedSlotsArray] = useLocalStorage<string[]>('week_schedule', [])
  const [selectedSlots, setSelectedSlotsState] = useState<Set<string>>(new Set(selectedSlotsArray))
  const [isDragging, setIsDragging] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  // For comparison mode - decode schedule from URL if present
  const [comparisonSlots, setComparisonSlots] = useState<Set<string>>(new Set<string>())

  // Extract shared schedule from URL on mount
  useEffect(() => {
    if (comparisonMode && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const encodedSchedule = params.get('schedule')
      if (encodedSchedule) {
        try {
          // Try new timezone-aware format first
          const { decodeScheduleWithTimezone } = require('@/lib/utils/timezone')
          const { convertedSlots } = decodeScheduleWithTimezone(encodedSchedule)
          setComparisonSlots(new Set(convertedSlots))
        } catch (e) {
          // Fallback to old format (plain array)
          try {
            const decoded = JSON.parse(decodeURIComponent(encodedSchedule))
            setComparisonSlots(new Set(decoded))
          } catch (fallbackError) {
            console.error('Failed to decode shared schedule:', fallbackError)
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

  // Calculate overlapping slots
  const getOverlappingSlots = () => {
    const overlaps: string[] = []
    selectedSlots.forEach(slot => {
      if (comparisonSlots.has(slot)) {
        overlaps.push(slot)
      }
    })
    return overlaps
  }

  const overlappingSlots = comparisonMode ? getOverlappingSlots() : []

  const getSlotKey = (day: string, hour: number) => `${day}-${hour}`

  const toggleSlot = (day: string, hour: number) => {
    const key = getSlotKey(day, hour)
    const newSlots = new Set(selectedSlots)

    if (newSlots.has(key)) {
      newSlots.delete(key)
    } else {
      newSlots.add(key)
    }

    setSelectedSlots(newSlots)
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am'
    if (hour < 12) return `${hour}am`
    if (hour === 12) return '12pm'
    return `${hour - 12}pm`
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border-[3px] border-yellow-bright">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-block bg-black text-yellow-bright px-6 py-2 rounded-full mb-3">
          <span className="font-bold text-lg">📅 This Week's Availability</span>
        </div>
        <p className="text-sm text-gray-600">
          Tap times when you're free to hang
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Days header */}
          <div className="flex">
            <div className="w-16 flex-shrink-0"></div>
            {days.map(day => (
              <div
                key={day}
                className="flex-1 text-center font-bold py-2 min-w-[60px] text-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Time slots - Only show prime hours (6pm - 2am) */}
          <div className="space-y-1">
            {[18, 19, 20, 21, 22, 23, 0, 1].map(hour => (
              <div key={hour} className="flex items-center">
                <div className="w-16 text-xs text-gray-500 text-right pr-2 flex-shrink-0">
                  {formatHour(hour)}
                </div>
                {days.map(day => {
                  const key = getSlotKey(day, hour)
                  const isSelected = selectedSlots.has(key)

                  const isComparison = comparisonSlots.has(key)
                  const isOverlap = comparisonMode && isSelected && isComparison

                  return (
                    <button
                      key={key}
                      onClick={() => !comparisonMode && toggleSlot(day, hour)}
                      onMouseEnter={() => !comparisonMode && isDragging && toggleSlot(day, hour)}
                      onMouseDown={() => {
                        if (!comparisonMode) {
                          setIsDragging(true)
                          toggleSlot(day, hour)
                        }
                      }}
                      onMouseUp={() => setIsDragging(false)}
                      className={`flex-1 h-10 min-w-[60px] transition-all rounded-lg mx-0.5 ${
                        isOverlap
                          ? 'bg-teal border-2 border-teal-dark'
                          : isSelected
                          ? 'bg-yellow-bright border-2 border-foreground'
                          : isComparison
                          ? 'bg-pink border-2 border-foreground'
                          : 'bg-background border border-gray-200'
                      } ${comparisonMode ? 'cursor-default' : 'cursor-pointer'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm flex-wrap">
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
          <div className="inline-block bg-teal text-white rounded-2xl px-6 py-3">
            <span className="font-bold">
              🎉 {overlappingSlots.length} hour{overlappingSlots.length !== 1 ? 's' : ''} of mutual free time!
            </span>
          </div>
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
      </div>
    </div>
  )
}
