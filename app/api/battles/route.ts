import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { winner_id, loser_id } = body

    if (!winner_id || !loser_id) {
      return NextResponse.json(
        { error: 'winner_id and loser_id are required' },
        { status: 400 }
      )
    }

    // Call atomic RPC function that handles everything in a single transaction
    const { data, error } = await supabase.rpc('process_battle', {
      p_user_id: user.id,
      p_winner_id: winner_id,
      p_loser_id: loser_id,
    })

    if (error) {
      console.error('Battle RPC error:', error)
      throw error
    }

    // The RPC function returns the result in the correct format
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error processing battle:', error)
    return NextResponse.json(
      { error: 'Failed to process battle' },
      { status: 500 }
    )
  }
}
