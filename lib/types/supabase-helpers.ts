// Helper types for Supabase queries to avoid @ts-ignore

import type { SupabaseClient } from '@supabase/supabase-js'

// Database query result helpers
export type DbResult<T> = {
  data: T | null
  error: any | null
}

export type DbResultArray<T> = {
  data: T[] | null
  error: any | null
}

// Supabase query builder types
export type QueryBuilder = ReturnType<SupabaseClient['from']>

export type SelectQuery<T = any> = ReturnType<QueryBuilder['select']>

// Safe query wrapper types
export type SafeRosterQuery = {
  id: string
  name: string
  status: string
  tier: string
  elo_rating: number
  avatar_url?: string | null
  avatar_color: string
  attraction_score: number
  personality_score: number
  reliability_score: number
  last_contact_date: string
  notes?: string | null
  created_at?: string
  updated_at?: string
  user_id: string
}

export type SafeBattleQuery = {
  id: string
  winner_id: string
  loser_id: string
  created_at: string
  user_id: string
}

export type SafeUserQuery = {
  id: string
  email: string
  created_at?: string
}

// Supabase error helper
export function isSupabaseError(error: any): error is { code: string; message: string; details: string } {
  return error && typeof error.code === 'string' && typeof error.message === 'string'
}

// Result unwrapper with type safety
export function unwrapResult<T>(result: DbResult<T>): T {
  if (result.error) {
    throw result.error
  }
  if (result.data === null) {
    throw new Error('No data returned from query')
  }
  return result.data
}

export function unwrapResultArray<T>(result: DbResultArray<T>): T[] {
  if (result.error) {
    throw result.error
  }
  return result.data || []
}
