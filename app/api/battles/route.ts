import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAuth, validateRequestBody, validateUUIDs } from '@/lib/api/validation'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  // Validate authentication
  const authResult = await validateAuth(request)
  if (authResult.error) {
    return authResult.error
  }
  const { user, supabase } = authResult

  try {
    const body = await request.json()

    // Validate required fields
    const validation = validateRequestBody<{ winner_id: string; loser_id: string }>(
      body,
      ['winner_id', 'loser_id']
    )

    if (!validation.valid) {
      return validation.error!
    }

    const { winner_id, loser_id } = validation.data!

    // Validate UUIDs to prevent injection
    const uuidError = validateUUIDs(winner_id, loser_id)
    if (uuidError) {
      return uuidError
    }

    // Call atomic RPC function that handles everything in a single transaction
    const { data, error } = await supabase.rpc('process_battle', {
      p_user_id: user.id,
      p_winner_id: winner_id,
      p_loser_id: loser_id,
    } as any)

    if (error) {
      logger.error('Battle RPC error:', error)
      throw error
    }

    // Mark this combination as shown in the daily tracker
    const { error: markError } = await supabase.rpc('mark_combination_shown', {
      p_user_id: user.id,
      p_person1_id: winner_id,
      p_person2_id: loser_id,
    } as any)

    if (markError) {
      logger.error('Error marking combination as shown:', markError)
      // Don't throw - battle was already processed successfully
    }

    // The RPC function returns the result in the correct format
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error processing battle:', error)
    return NextResponse.json(
      { error: 'Failed to process battle' },
      { status: 500 }
    )
  }
}
