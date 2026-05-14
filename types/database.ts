export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      sports: {
        Row: { id: number; name: string; icon: string | null; created_at: string }
        Insert: { name: string; icon?: string | null }
        Update: { name?: string; icon?: string | null }
      }
      leagues: {
        Row: { id: number; sport_id: number; name: string; api_football_id: number | null; season: number | null; created_at: string }
        Insert: { sport_id: number; name: string; api_football_id?: number | null; season?: number | null }
        Update: { sport_id?: number; name?: string; api_football_id?: number | null; season?: number | null }
      }
      teams: {
        Row: { id: number; league_id: number; name: string; logo_url: string | null; api_football_id: number | null; created_at: string }
        Insert: { league_id: number; name: string; logo_url?: string | null; api_football_id?: number | null }
        Update: { league_id?: number; name?: string; logo_url?: string | null; api_football_id?: number | null }
      }
      fixtures: {
        Row: { id: number; league_id: number; home_team_id: number; away_team_id: number; kickoff_at: string | null; home_score: number | null; away_score: number | null; status: string | null; api_football_id: number | null; created_at: string }
        Insert: { league_id: number; home_team_id: number; away_team_id: number; kickoff_at?: string | null; home_score?: number | null; away_score?: number | null; status?: string | null; api_football_id?: number | null }
        Update: { league_id?: number; home_team_id?: number; away_team_id?: number; kickoff_at?: string | null; home_score?: number | null; away_score?: number | null; status?: string | null; api_football_id?: number | null }
      }
      players: {
        Row: { id: number; team_id: number; name: string; position: string | null; available: boolean; injury_detail: string | null; created_at: string }
        Insert: { team_id: number; name: string; position?: string | null; available?: boolean; injury_detail?: string | null }
        Update: { team_id?: number; name?: string; position?: string | null; available?: boolean; injury_detail?: string | null }
      }
      simulations: {
        Row: { id: number; fixture_id: number; type: string; result_json: Json; narrative: string | null; created_at: string }
        Insert: { fixture_id: number; type: string; result_json: Json; narrative?: string | null }
        Update: { fixture_id?: number; type?: string; result_json?: Json; narrative?: string | null }
      }
      simulation_runs: {
        Row: { id: number; simulation_id: number; runs: number; home_win_prob: number; draw_prob: number; away_win_prob: number; created_at: string }
        Insert: { simulation_id: number; runs: number; home_win_prob: number; draw_prob: number; away_win_prob: number }
        Update: { simulation_id?: number; runs?: number; home_win_prob?: number; draw_prob?: number; away_win_prob?: number }
      }
      api_cache: {
        Row: { id: number; cache_key: string; data: Json; expires_at: string; created_at: string }
        Insert: { cache_key: string; data: Json; expires_at: string }
        Update: { cache_key?: string; data?: Json; expires_at?: string }
      }
    }
  }
}

export type Sport = Database['public']['Tables']['sports']['Row']
export type League = Database['public']['Tables']['leagues']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Fixture = Database['public']['Tables']['fixtures']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Simulation = Database['public']['Tables']['simulations']['Row']
export type SimulationRun = Database['public']['Tables']['simulation_runs']['Row']
