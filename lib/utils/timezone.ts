/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Convert schedule slots from one timezone to another
 * Schedule format: ["Mon-18", "Tue-20", ...] where hour is 0-23
 */
export function convertScheduleTimezone(
  slots: string[],
  fromTimezone: string,
  toTimezone: string
): string[] {
  if (fromTimezone === toTimezone) {
    return slots // No conversion needed
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const convertedSlots: string[] = []

  // Use a reference date (doesn't matter which week, just need the TZ offset difference)
  const referenceDate = new Date('2024-01-01T00:00:00') // Monday

  slots.forEach(slot => {
    const [day, hourStr] = slot.split('-')
    const hour = parseInt(hourStr, 10)

    // Find day index
    const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day)
    if (dayIndex === -1) return

    // Create a date in the source timezone for this day/hour
    // Add dayIndex to get to the right weekday
    const sourceDate = new Date(referenceDate)
    sourceDate.setDate(sourceDate.getDate() + dayIndex)
    sourceDate.setHours(hour, 0, 0, 0)

    // Format in source timezone
    const sourceTimeStr = sourceDate.toLocaleString('en-US', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Parse back to get UTC
    const utcTime = new Date(sourceTimeStr)

    // Format in target timezone
    const targetTimeStr = utcTime.toLocaleString('en-US', {
      timeZone: toTimezone,
      weekday: 'short',
      hour: 'numeric',
      hour12: false
    })

    // Parse the target time string to extract day and hour
    const parts = targetTimeStr.split(', ')
    if (parts.length >= 2) {
      const targetDay = parts[0]
      const targetHourMatch = parts[1].match(/(\d+)/)
      if (targetHourMatch) {
        const targetHour = parseInt(targetHourMatch[1], 10)

        // Map day abbreviation
        const dayMap: { [key: string]: string } = {
          'Sun': 'Sun',
          'Mon': 'Mon',
          'Tue': 'Tue',
          'Wed': 'Wed',
          'Thu': 'Thu',
          'Fri': 'Fri',
          'Sat': 'Sat'
        }

        const mappedDay = dayMap[targetDay]
        if (mappedDay && days.includes(mappedDay)) {
          // Adjust day format (we use Mon-Sun, not Sun-Sat)
          const adjustedDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].find(d =>
            d === mappedDay || d.substring(0, 3) === targetDay
          )
          if (adjustedDay) {
            convertedSlots.push(`${adjustedDay}-${targetHour}`)
          }
        }
      }
    }
  })

  return [...new Set(convertedSlots)] // Remove duplicates
}

/**
 * Encode schedule with timezone info for sharing
 */
export function encodeScheduleWithTimezone(slots: string[]): string {
  const data = {
    slots,
    timezone: getUserTimezone(),
    encoded_at: new Date().toISOString()
  }
  return encodeURIComponent(JSON.stringify(data))
}

/**
 * Decode schedule and convert to user's timezone
 */
export function decodeScheduleWithTimezone(encoded: string): {
  slots: string[]
  originalTimezone: string
  convertedSlots: string[]
} {
  try {
    const data = JSON.parse(decodeURIComponent(encoded))
    const userTimezone = getUserTimezone()

    // Convert from sender's timezone to receiver's timezone
    const convertedSlots = convertScheduleTimezone(
      data.slots || [],
      data.timezone || userTimezone,
      userTimezone
    )

    return {
      slots: data.slots || [],
      originalTimezone: data.timezone || userTimezone,
      convertedSlots
    }
  } catch (e) {
    console.error('Failed to decode schedule:', e)
    return {
      slots: [],
      originalTimezone: getUserTimezone(),
      convertedSlots: []
    }
  }
}
