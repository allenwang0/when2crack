// Track login streak for achievements

export function updateLoginStreak(): number {
  const today = new Date().toDateString()
  const lastLogin = localStorage.getItem('last_login_date')
  const currentStreak = parseInt(localStorage.getItem('login_streak') || '0')

  if (lastLogin === today) {
    // Already logged in today, return current streak
    return currentStreak
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toDateString()

  let newStreak: number
  if (lastLogin === yesterdayStr) {
    // Logged in yesterday, increment streak
    newStreak = currentStreak + 1
  } else if (lastLogin === null) {
    // First time login
    newStreak = 1
  } else {
    // Streak broken, start over
    newStreak = 1
  }

  localStorage.setItem('last_login_date', today)
  localStorage.setItem('login_streak', newStreak.toString())

  return newStreak
}

export function getLoginStreak(): number {
  const today = new Date().toDateString()
  const lastLogin = localStorage.getItem('last_login_date')
  const currentStreak = parseInt(localStorage.getItem('login_streak') || '0')

  if (lastLogin !== today) {
    // Check if streak is broken
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()

    if (lastLogin !== yesterdayStr && lastLogin !== null) {
      // Streak broken, return 0
      return 0
    }
  }

  return currentStreak
}
