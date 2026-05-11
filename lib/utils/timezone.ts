/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Convert schedule slots from one timezone to another
 * Schedule format: ["Mon-18", "Tue-20", ...] where hour is 0-23
 *
 * Uses proper UTC conversion to handle timezones and DST correctly
 */
export function convertScheduleTimezone(
  slots: string[],
  fromTimezone: string,
  toTimezone: string
): string[] {
  if (fromTimezone === toTimezone) {
    return slots // No conversion needed
  }

  // Validate timezone names
  try {
    Intl.DateTimeFormat('en-US', { timeZone: fromTimezone })
    Intl.DateTimeFormat('en-US', { timeZone: toTimezone })
  } catch (error) {
    console.error('Invalid timezone:', error)
    return slots // Return original if timezones are invalid
  }

  const convertedSlots: string[] = []
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Use current week to respect current DST status
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday
  const daysUntilMonday = currentDay === 0 ? 1 : 1 - currentDay + 7
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)
  monday.setHours(0, 0, 0, 0)

  slots.forEach(slot => {
    const [day, hourStr] = slot.split('-')
    const hour = parseInt(hourStr, 10)

    if (isNaN(hour) || hour < 0 || hour > 23) {
      return // Invalid hour
    }

    const dayIndex = dayOrder.indexOf(day)
    if (dayIndex === -1) {
      return // Invalid day
    }

    // Create date for this specific day/hour in the week
    const slotDate = new Date(monday)
    slotDate.setDate(monday.getDate() + dayIndex)
    slotDate.setHours(0, 0, 0, 0)

    // Create a date string representing this time in the source timezone
    // We'll build an ISO-like string and then interpret it in the source timezone
    const year = slotDate.getFullYear()
    const month = String(slotDate.getMonth() + 1).padStart(2, '0')
    const dayOfMonth = String(slotDate.getDate()).padStart(2, '0')
    const hourStr2 = String(hour).padStart(2, '0')

    // Parse this time as if it's in the source timezone
    // We do this by using toLocaleString to get what UTC time would produce this local time
    const testDate = new Date(`${year}-${month}-${dayOfMonth}T${hourStr2}:00:00`)

    // Format in source timezone to see what time it shows
    const sourceFormatted = testDate.toLocaleString('en-US', {
      timeZone: fromTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // Calculate the offset: what we want minus what we got
    const [sourceHourStr, sourceMinStr] = sourceFormatted.split(':')
    const sourceHour = parseInt(sourceHourStr)
    const offsetHours = hour - sourceHour

    // Apply offset to get correct UTC time
    const utcDate = new Date(testDate)
    utcDate.setHours(utcDate.getHours() + offsetHours)

    // Now format in target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTimezone,
      weekday: 'short',
      hour: '2-digit',
      hour12: false
    })

    const targetParts = targetFormatter.formatToParts(utcDate)
    const targetWeekday = targetParts.find(p => p.type === 'weekday')?.value || ''
    const targetHourPart = targetParts.find(p => p.type === 'hour')?.value || '0'
    const targetHour = parseInt(targetHourPart)

    // Map short weekday names
    const dayMap: { [key: string]: string } = {
      'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed',
      'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun'
    }

    const mappedDay = dayMap[targetWeekday]
    if (mappedDay && !isNaN(targetHour) && targetHour >= 0 && targetHour <= 23) {
      convertedSlots.push(`${mappedDay}-${targetHour}`)
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
