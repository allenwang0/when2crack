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
    type BattlePairResult = {
      person1_id: string | null
      person2_id: string | null
      remaining_count: number
      total_count: number
    }

    const { data: pairData, error: pairError } = await supabase
      .rpc('get_next_daily_battle_pair', { p_user_id: user.id } as any)
      .single() as { data: BattlePairResult | null; error: any }

    if (pairError) {
      console.error('RPC error getting battle pair:', pairError)
      throw pairError
    }

    // If no pair returned, check if it's because roster is empty or all combinations exhausted
    if (!pairData || !pairData.person1_id || !pairData.person2_id) {
      // Check if user has any active roster members
      const { count, error: countError } = await supabase
        .from('roster')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'Archived')

      if (countError) {
        console.error('Error checking roster count:', countError)
        throw countError
      }

      // If roster is empty or has < 2 people, return empty roster error
      if (!count || count < 2) {
        console.log(`User ${user.id} has insufficient roster (${count} people)`)
        return NextResponse.json(
          {
            errorCode: 'EMPTY_ROSTER',
            error: 'You need at least 2 people in your roster to start battles.',
            message: 'Add more people to your roster to begin comparing!',
            rosterCount: count || 0,
          },
          { status: 200 } // Use 200 to distinguish from system errors
        )
      }

      // Otherwise, all combinations are exhausted for today
      console.log(`User ${user.id} exhausted all daily combinations (total: ${pairData?.total_count || 0})`)
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
    const { data: person1Data, error: p1Error } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, attraction_score, personality_score, reliability_score')
      .eq('id', pairData.person1_id)
      .single()

    if (p1Error || !person1Data) {
      console.error('Error fetching person1:', p1Error)
      throw p1Error || new Error('Person1 not found')
    }

    const { data: person2Data, error: p2Error } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, attraction_score, personality_score, reliability_score')
      .eq('id', pairData.person2_id)
      .single()

    if (p2Error || !person2Data) {
      console.error('Error fetching person2:', p2Error)
      throw p2Error || new Error('Person2 not found')
    }

    const person1 = person1Data as RosterPerson
    const person2 = person2Data as RosterPerson

    console.log(`Successfully fetched battle pair for user ${user.id}: ${person1.name} vs ${person2.name}`)
    return NextResponse.json({
      person1,
      person2,
      remaining: pairData.remaining_count,
      total: pairData.total_count,
    })
  } catch (error) {
    console.error('Error getting battle pair:', error)
    return NextResponse.json(
      {
        errorCode: 'SYSTEM_ERROR',
        error: 'Something went wrong while loading battles. Please try again.',
      },
      { status: 500 }
    )
  }
}
