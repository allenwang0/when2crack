import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateElo } from '@/lib/algorithms/elo'

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

    // Get current Elo ratings
    // @ts-ignore
    const { data: winner, error: winnerError } = await supabase
      .from('roster')
      .select('elo_rating')
      .eq('id', winner_id)
      .eq('user_id', user.id)
      .single()

    if (winnerError) throw winnerError

    // @ts-ignore
    const { data: loser, error: loserError } = await supabase
      .from('roster')
      .select('elo_rating')
      .eq('id', loser_id)
      .eq('user_id', user.id)
      .single()

    if (loserError) throw loserError

    // Calculate new Elo ratings
    const [newWinnerRating, newLoserRating] = updateElo(
      winner.elo_rating,
      loser.elo_rating
    )

    // Update both ratings in parallel
    const updates = [
      // @ts-ignore
      supabase
        .from('roster')
        .update({ elo_rating: newWinnerRating })
        .eq('id', winner_id)
        .eq('user_id', user.id),
      // @ts-ignore
      supabase
        .from('roster')
        .update({ elo_rating: newLoserRating })
        .eq('id', loser_id)
        .eq('user_id', user.id),
    ]

    await Promise.all(updates)

    // Log the battle
    // @ts-ignore
    const { error: battleError } = await supabase.from('battles').insert({
      user_id: user.id,
      winner_id,
      loser_id,
    })

    if (battleError) throw battleError

    return NextResponse.json({
      success: true,
      winner: {
        id: winner_id,
        old_rating: winner.elo_rating,
        new_rating: newWinnerRating,
        change: newWinnerRating - winner.elo_rating,
      },
      loser: {
        id: loser_id,
        old_rating: loser.elo_rating,
        new_rating: newLoserRating,
        change: newLoserRating - loser.elo_rating,
      },
    })
  } catch (error) {
    console.error('Error processing battle:', error)
    return NextResponse.json(
      { error: 'Failed to process battle' },
      { status: 500 }
    )
  }
}
