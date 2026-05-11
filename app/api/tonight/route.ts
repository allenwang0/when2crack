import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTonightRecommendations } from '@/lib/algorithms/tonight'
import type { RosterPerson } from '@/lib/types'

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
    // Fetch user's roster (active only) - only columns needed for recommendations
    // @ts-ignore
    const { data: roster, error: rosterError } = await supabase
      .from('roster')
      .select('id, name, status, tier, elo_rating, avatar_url, avatar_color, last_contact_date, reliability_score, attraction_score, personality_score')
      .eq('user_id', user.id)
      .neq('status', 'Archived')

    if (rosterError) throw rosterError

    if (!roster || roster.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: 'Your roster is empty',
      })
    }

    // Get top 3 recommendations
    const recommendations = getTonightRecommendations(
      roster as RosterPerson[],
      3
    )

    return NextResponse.json({
      recommendations,
      total_active: roster.length,
    })
  } catch (error) {
    console.error('Error getting tonight recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
