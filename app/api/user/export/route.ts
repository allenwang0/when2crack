import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/export
 * Export all user data (GDPR compliance)
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

    // Fetch all user data
    const [
      { data: profile },
      { data: roster },
      { data: battles },
      { data: hangs },
      { data: schedule },
      { data: achievements },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('roster').select('*').eq('user_id', user.id),
      supabase.from('battles').select('*').eq('user_id', user.id),
      supabase.from('hangs').select('*').eq('user_id', user.id),
      (supabase.from('user_schedules') as any)
        .select('*')
        .eq('user_id', user.id)
        .single(),
      (supabase.from('user_achievements') as any).select('*').eq('user_id', user.id),
    ])

    // Try to get when2crack shares (table might not exist)
    let when2crackShares = null
    try {
      const { data } = await (supabase.from('when2crack_shares') as any)
        .select('*')
        .eq('sender_id', user.id)
      when2crackShares = data
    } catch {
      // Table doesn't exist yet
    }

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      userInfo: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
      },
      profile: profile || null,
      roster: roster || [],
      battles: battles || [],
      hangs: hangs || [],
      schedule: schedule?.schedule_data || null,
      achievements: achievements || [],
      when2crackShares: when2crackShares || [],
      metadata: {
        version: '1.0',
        format: 'JSON',
        totalRecords: {
          roster: roster?.length || 0,
          battles: battles?.length || 0,
          hangs: hangs?.length || 0,
          achievements: achievements?.length || 0,
          when2crackShares: when2crackShares?.length || 0,
        },
      },
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="when2crack-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
