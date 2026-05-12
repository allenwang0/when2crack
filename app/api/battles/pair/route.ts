import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { selectBattlePair } from '@/lib/algorithms/battles'
import type { RosterPerson, Battle } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get next battle pair using the daily combination system
    const { data: pairData, error: pairError } = await supabase
      .rpc('get_next_daily_battle_pair', { p_user_id: user.id })
      .single()

    if (pairError) throw pairError

    // If no pair returned, all combinations are exhausted for today
    if (!pairData || !pairData.person1_id || !pairData.person2_id) {
      return NextResponse.json(
        {
          exhausted: true,
          message: 'All comparisons completed for today! Come back tomorrow for a fresh set.',
          remaining: 0,
          total: pairData?.total_count || 0,
        },
        { status: 200 }
      )
    }

    // Fetch the full person details
    const { data: person1, error: p1Error } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, attraction_score, personality_score, reliability_score')
      .eq('id', pairData.person1_id)
      .single()

    if (p1Error) throw p1Error

    const { data: person2, error: p2Error } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, attraction_score, personality_score, reliability_score')
      .eq('id', pairData.person2_id)
      .single()

    if (p2Error) throw p2Error

    return NextResponse.json({
      person1,
      person2,
      remaining: pairData.remaining_count,
      total: pairData.total_count,
    })
  } catch (error) {
    console.error('Error getting battle pair:', error)
    return NextResponse.json(
      { error: 'Failed to get battle pair' },
      { status: 500 }
    )
  }
}
