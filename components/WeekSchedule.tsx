'use client'

import { useState } from 'react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

interface TimeSlot {
  day: string
  hour: number
  available: boolean
}

export function WeekSchedule() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i) // 0-23

  const [selectedSlotsArray, setSelectedSlotsArray] = useLocalStorage<string[]>('week_schedule', [])
  const [selectedSlots, setSelectedSlotsState] = useState<Set<string>>(new Set(selectedSlotsArray))
  const [isDragging, setIsDragging] = useState(false)

  const setSelectedSlots = (newSlots: Set<string>) => {
    setSelectedSlotsState(newSlots)
    setSelectedSlotsArray(Array.from(newSlots))
  }

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
    <div className="bg-white rounded-3xl p-6 shadow-lg" style={{ border: '3px solid #FFD93D' }}>
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
                className="flex-1 text-center font-bold py-2 min-w-[60px]"
                style={{ color: '#1A1A1A' }}
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

                  return (
                    <button
                      key={key}
                      onClick={() => toggleSlot(day, hour)}
                      onMouseEnter={() => isDragging && toggleSlot(day, hour)}
                      onMouseDown={() => {
                        setIsDragging(true)
                        toggleSlot(day, hour)
                      }}
                      onMouseUp={() => setIsDragging(false)}
                      className="flex-1 h-10 min-w-[60px] transition-all rounded-lg mx-0.5"
                      style={{
                        backgroundColor: isSelected ? '#FFD93D' : '#F5F5F0',
                        border: isSelected ? '2px solid #1A1A1A' : '1px solid #E8E8E8',
                        cursor: 'pointer'
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: '#FFD93D', border: '2px solid #1A1A1A' }}
          />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: '#F5F5F0', border: '1px solid #E8E8E8' }}
          />
          <span>Unavailable</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 text-center">
        <div className="inline-block bg-yellow-soft rounded-2xl px-6 py-3">
          <span className="font-bold text-black">
            {selectedSlots.size} hours marked as available
          </span>
        </div>
      </div>
    </div>
  )
}
