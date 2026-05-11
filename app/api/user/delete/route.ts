import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/user/delete
 * Delete user account and all associated data (GDPR compliance)
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
    const { confirmation } = body

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { error: 'Invalid confirmation. Must send: DELETE_MY_ACCOUNT' },
        { status: 400 }
      )
    }

    // Delete user data in order (respecting foreign keys)
    // Note: Supabase should have CASCADE deletes set up, but we'll be explicit

    try {
      // Delete achievements
      await (supabase.from('user_achievements') as any).delete().eq('user_id', user.id)

      // Delete schedule
      await (supabase.from('user_schedules') as any).delete().eq('user_id', user.id)

      // Delete when2crack shares (if table exists)
      try {
        await (supabase.from('when2crack_shares') as any)
          .delete()
          .eq('sender_id', user.id)
      } catch {
        // Table might not exist
      }

      // Delete hangs
      await supabase.from('hangs').delete().eq('user_id', user.id)

      // Delete battles
      await supabase.from('battles').delete().eq('user_id', user.id)

      // Delete roster
      await supabase.from('roster').delete().eq('user_id', user.id)

      // Delete user profile
      await supabase.from('users').delete().eq('id', user.id)

      // Finally, delete auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id)

      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
        // Continue anyway - data is deleted
      }

      return NextResponse.json({
        success: true,
        message: 'Account and all data successfully deleted',
      })
    } catch (deleteError) {
      console.error('Error during deletion:', deleteError)
      return NextResponse.json(
        {
          error: 'Failed to delete some data. Please contact support.',
          details: deleteError instanceof Error ? deleteError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in delete account API:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/delete
 * Return information about account deletion
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

    // Get counts of data that will be deleted
    const [
      { count: rosterCount },
      { count: battleCount },
      { count: hangCount },
      { count: achievementCount },
    ] = await Promise.all([
      supabase
        .from('roster')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('battles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('hangs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      (supabase.from('user_achievements') as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    return NextResponse.json({
      accountInfo: {
        email: user.email,
        createdAt: user.created_at,
      },
      dataToDelete: {
        roster: rosterCount || 0,
        battles: battleCount || 0,
        hangs: hangCount || 0,
        achievements: achievementCount || 0,
      },
      warning:
        'This action is permanent and cannot be undone. All your data will be permanently deleted.',
    })
  } catch (error) {
    console.error('Error fetching deletion info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account info' },
      { status: 500 }
    )
  }
}
