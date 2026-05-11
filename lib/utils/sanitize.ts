/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeText(input: string): string {
  if (!input) return ''

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sanitize and validate name input
 * Max 50 characters, no special chars except spaces, hyphens, apostrophes
 */
export function sanitizeName(name: string): string {
  return sanitizeText(name)
    .replace(/[^a-zA-Z0-9\s\-']/g, '')
    .slice(0, 50)
}

/**
 * Sanitize notes/textarea input
 * Max 500 characters, allows basic punctuation
 */
export function sanitizeNotes(notes: string): string {
  return sanitizeText(notes).slice(0, 500)
}

/**
 * Validate and sanitize score input (1-10)
 */
export function sanitizeScore(score: number): number {
  const num = parseInt(String(score), 10)
  if (isNaN(num)) return 5 // Default to middle
  return Math.max(1, Math.min(10, num))
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  const lower = url.toLowerCase().trim()

  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return ''
  }

  // Only allow http, https, or relative URLs
  if (
    !lower.startsWith('http://') &&
    !lower.startsWith('https://') &&
    !lower.startsWith('/')
  ) {
    return `https://${url}`
  }

  return url
}
