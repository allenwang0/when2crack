/**
 * CSRF Protection Utilities
 * Implements Double Submit Cookie pattern for CSRF protection
 */

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure random token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH)

  if (typeof window !== 'undefined') {
    // Browser environment
    window.crypto.getRandomValues(array)
  } else {
    // Node environment
    require('crypto').randomFillSync(array)
  }

  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token in cookie (server-side)
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken()
  const cookieStore = await cookies()

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  return token
}

/**
 * Get CSRF token from cookie (server-side)
 */
export async function getCSRFToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CSRF_TOKEN_NAME)
  return token?.value
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return cookieToken === headerToken
}

/**
 * Get CSRF token for client-side use
 * This should be called in a server component or API route
 */
export async function getCSRFTokenForClient(): Promise<string> {
  let token = await getCSRFToken()

  if (!token) {
    token = await setCSRFToken()
  }

  return token
}

/**
 * Client-side: Get CSRF token from meta tag or API
 */
export function getClientCSRFToken(): string | null {
  if (typeof window === 'undefined') return null

  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]')
  if (metaTag) {
    return metaTag.getAttribute('content')
  }

  // Fallback to cookie (less secure but works)
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_TOKEN_NAME) {
      return value
    }
  }

  return null
}

/**
 * Add CSRF token to fetch request headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getClientCSRFToken()

  if (!token) {
    console.warn('CSRF token not found, request may be rejected')
    return headers
  }

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
  }
}

/**
 * Safe fetch wrapper with CSRF protection
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfHeaders = addCSRFHeader(options.headers)

  return fetch(url, {
    ...options,
    headers: csrfHeaders,
    credentials: 'same-origin', // Important for cookies
  })
}
