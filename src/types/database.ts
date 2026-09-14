export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          height_cm: number | null
          weight_kg: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_settings: {
        Row: {
          user_id: string
          daily_calorie_goal: number
          target_protein_g: number
          target_carbs_g: number
          target_fat_g: number
          activity_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          daily_calorie_goal?: number
          target_protein_g?: number
          target_carbs_g?: number
          target_fat_g?: number
          activity_level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          daily_calorie_goal?: number
          target_protein_g?: number
          target_carbs_g?: number
          target_fat_g?: number
          activity_level?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          id: string
          user_id: string
          name: string
          entry_type: 'intake' | 'burn'
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          logged_at: string
          raw_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          entry_type: 'intake' | 'burn'
          calories: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          logged_at?: string
          raw_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          entry_type?: 'intake' | 'burn'
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          logged_at?: string
          raw_prompt?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileSettings = Database['public']['Tables']['profile_settings']['Row']
export type Entry = Database['public']['Tables']['entries']['Row']
export type NewEntry = Database['public']['Tables']['entries']['Insert']
