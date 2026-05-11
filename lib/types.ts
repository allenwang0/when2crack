// Database types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          availability_window_start: string
          availability_window_end: string
          panic_mode: boolean
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          availability_window_start?: string
          availability_window_end?: string
          panic_mode?: boolean
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          availability_window_start?: string
          availability_window_end?: string
          panic_mode?: boolean
          avatar_url?: string | null
          created_at?: string
        }
      }
      roster: {
        Row: {
          id: string
          user_id: string
          name: string
          tier: 'S' | 'A' | 'B' | 'C'
          status: 'New' | 'Chatting' | 'Met Once' | 'Regular' | 'Archived'
          attraction_score: number
          personality_score: number
          reliability_score: number
          elo_rating: number
          notes: string | null
          avatar_color: string
          avatar_url: string | null
          last_contact_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          tier: 'S' | 'A' | 'B' | 'C'
          status: 'New' | 'Chatting' | 'Met Once' | 'Regular' | 'Archived'
          attraction_score?: number
          personality_score?: number
          reliability_score?: number
          elo_rating?: number
          notes?: string | null
          avatar_color?: string
          avatar_url?: string | null
          last_contact_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          tier?: 'S' | 'A' | 'B' | 'C'
          status?: 'New' | 'Chatting' | 'Met Once' | 'Regular' | 'Archived'
          attraction_score?: number
          personality_score?: number
          reliability_score?: number
          elo_rating?: number
          notes?: string | null
          avatar_color?: string
          avatar_url?: string | null
          last_contact_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hangs: {
        Row: {
          id: string
          roster_id: string
          user_id: string
          hang_date: string
          attraction_change: number
          personality_change: number
          reliability_change: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          roster_id: string
          user_id: string
          hang_date?: string
          attraction_change?: number
          personality_change?: number
          reliability_change?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          roster_id?: string
          user_id?: string
          hang_date?: string
          attraction_change?: number
          personality_change?: number
          reliability_change?: number
          notes?: string | null
          created_at?: string
        }
      }
      battles: {
        Row: {
          id: string
          user_id: string
          winner_id: string
          loser_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          winner_id: string
          loser_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          winner_id?: string
          loser_id?: string
          created_at?: string
        }
      }
      outreach_log: {
        Row: {
          id: string
          roster_id: string
          user_id: string
          outreach_date: string
          responded: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          roster_id: string
          user_id: string
          outreach_date?: string
          responded?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          roster_id?: string
          user_id?: string
          outreach_date?: string
          responded?: boolean | null
          created_at?: string
        }
      }
    }
  }
}

// Application types
export type Tier = 'S' | 'A' | 'B' | 'C'
export type Status = 'New' | 'Chatting' | 'Met Once' | 'Regular' | 'Archived'

export type RosterPerson = Database['public']['Tables']['roster']['Row']
export type Hang = Database['public']['Tables']['hangs']['Row']
export type Battle = Database['public']['Tables']['battles']['Row']
export type OutreachLog = Database['public']['Tables']['outreach_log']['Row']
export type User = Database['public']['Tables']['users']['Row']

// Extended types with computed fields
export type RosterPersonWithMomentum = RosterPerson & {
  composite_score: number
  momentum: number
  recent_hangs: Hang[]
}

export type TonightRecommendation = {
  person: RosterPerson
  tonight_score: number
  reasoning: {
    tier: Tier
    reliability: number
    recency_days: number
    elo_rating: number
  }
}

export type BattlePair = {
  person1: RosterPerson
  person2: RosterPerson
}
