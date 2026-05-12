/**
 * API validation utilities
 * Centralized validation for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeScore } from '@/lib/utils/sanitize'

/**
 * Validate authentication
 * @param request - Next.js request object
 * @returns User and Supabase client if authenticated, error response if not
 */
export async function validateAuth(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, supabase }
}

/**
 * Validate required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Validation result with data or error
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: (keyof T)[]
): { valid: boolean; error?: NextResponse; data?: T } {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return {
        valid: false,
        error: NextResponse.json(
          { error: `${String(field)} is required` },
          { status: 400 }
        ),
      }
    }
  }

  return { valid: true, data: body as T }
}

/**
 * Validate UUID format
 * @param id - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate multiple UUIDs
 * @param ids - Array of IDs to validate
 * @returns Error response if any invalid, null if all valid
 */
export function validateUUIDs(...ids: string[]): NextResponse | null {
  for (const id of ids) {
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }
  }
  return null
}

/**
 * Sanitize request body fields
 * @param body - Request body object
 * @returns Sanitized body
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sanitized: any = {}

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Sanitize strings
      sanitized[key] = sanitizeText(value)
    } else if (typeof value === 'number') {
      // Validate numbers are finite
      sanitized[key] = Number.isFinite(value) ? value : 0
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      sanitized[key] = value.map((item) =>
        typeof item === 'object' ? sanitizeRequestBody(item) : item
      )
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeRequestBody(value)
    } else {
      // Keep other types as-is (boolean, null, etc.)
      sanitized[key] = value
    }
  }

  return sanitized
}
