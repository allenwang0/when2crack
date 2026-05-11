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
    // Fetch user's roster (active only) - only columns needed for battles
    const { data: roster, error: rosterError } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, attraction_score, personality_score, reliability_score')
      .eq('user_id', user.id)
      .neq('status', 'Archived')
      .returns<RosterPerson[]>()

    if (rosterError) throw rosterError

    // Fetch battle history - only columns needed for algorithm
    const { data: battles, error: battlesError } = await supabase
      .from('battles')
      .select('id, winner_id, loser_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .returns<Battle[]>()

    if (battlesError) throw battlesError

    // Select next battle pair
    const pair = selectBattlePair(
      roster || [],
      battles || []
    )

    if (!pair) {
      return NextResponse.json(
        { error: 'Not enough people in roster for battles' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      person1: pair.person1,
      person2: pair.person2,
    })
  } catch (error) {
    console.error('Error getting battle pair:', error)
    return NextResponse.json(
      { error: 'Failed to get battle pair' },
      { status: 500 }
    )
  }
}
