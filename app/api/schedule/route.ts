import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/schedule
 * Fetch user's schedule from database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's schedule
    const { data, error } = await (supabase
      .from('user_schedules') as any)
      .select('schedule_data, updated_at')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no schedule found, return empty
      if (error.code === 'PGRST116') {
        return NextResponse.json({ schedule: null })
      }
      throw error
    }

    return NextResponse.json({
      schedule: data.schedule_data,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/schedule
 * Save user's schedule to database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { schedule } = body

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule data required' },
        { status: 400 }
      )
    }

    // Upsert schedule (insert or update)
    const { error } = await (supabase
      .from('user_schedules') as any)
      .upsert(
        {
          user_id: user.id,
          schedule_data: schedule,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('Error saving schedule:', error)
      return NextResponse.json(
        { error: 'Failed to save schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving schedule:', error)
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/schedule
 * Delete user's schedule from database
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await (supabase
      .from('user_schedules') as any)
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting schedule:', error)
      return NextResponse.json(
        { error: 'Failed to delete schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}
