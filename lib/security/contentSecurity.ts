/**
 * Content Security and XSS Prevention Utilities
 */

/**
 * Escape HTML to prevent XSS
 * React does this automatically for text nodes, but use this for manual HTML construction
 */
export function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Strip all HTML tags from a string
 */
export function stripHTML(html: string): string {
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  // Server-side: basic tag stripping
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Validate that a string doesn't contain script tags or event handlers
 */
export function containsDangerousContent(content: string): boolean {
  const dangerous = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /eval\(/i,
    /expression\(/i, // IE specific
  ]

  return dangerous.some(pattern => pattern.test(content))
}

/**
 * Sanitize user input for safe display
 */
export function sanitizeForDisplay(input: string): string {
  // First strip HTML
  let safe = stripHTML(input)

  // Then escape any remaining special characters
  safe = escapeHTML(safe)

  // Limit length to prevent DOS
  const MAX_DISPLAY_LENGTH = 1000
  if (safe.length > MAX_DISPLAY_LENGTH) {
    safe = safe.substring(0, MAX_DISPLAY_LENGTH) + '...'
  }

  return safe
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(): string {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs unsafe-eval
    "style-src 'self' 'unsafe-inline'", // TailwindCSS needs unsafe-inline
    "img-src 'self' data: https:", // Allow data URLs for base64 images
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]

  return policies.join('; ')
}

/**
 * Validate that user-generated content is safe
 */
export function validateUserContent(content: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check length
  if (content.length > 10000) {
    errors.push('Content too long (max 10000 characters)')
  }

  // Check for dangerous content
  if (containsDangerousContent(content)) {
    errors.push('Content contains potentially dangerous code')
  }

  // Check for excessive special characters (possible injection attempt)
  const specialCharCount = (content.match(/[<>{}[\]\\]/g) || []).length
  if (specialCharCount > content.length * 0.1) {
    errors.push('Content contains excessive special characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Rate limiting token bucket for preventing abuse
 */
export class RateLimiter {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map()

  constructor(
    private maxTokens: number = 10,
    private refillRate: number = 1, // tokens per second
    private cleanupInterval: number = 60000 // 1 minute
  ) {
    // Periodic cleanup of old buckets
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), cleanupInterval)
    }
  }

  /**
   * Check if action is allowed for given identifier
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    let bucket = this.buckets.get(identifier)

    if (!bucket) {
      bucket = { tokens: this.maxTokens - 1, lastRefill: now }
      this.buckets.set(identifier, bucket)
      return true
    }

    // Refill tokens based on time passed
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now

    // Check if we have tokens available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      return true
    }

    return false
  }

  /**
   * Cleanup old buckets
   */
  private cleanup() {
    const now = Date.now()
    const maxAge = 300000 // 5 minutes

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key)
      }
    }
  }
}
