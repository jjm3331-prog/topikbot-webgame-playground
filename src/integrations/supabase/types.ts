export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          hit_count: number | null
          id: string
          request_params: Json | null
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          function_name: string
          hit_count?: number | null
          id?: string
          request_params?: Json | null
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          hit_count?: number | null
          id?: string
          request_params?: Json | null
          response?: Json
        }
        Relationships: []
      }
      manager_chapter_logs: {
        Row: {
          chapter_number: number
          choices_made: Json
          completed: boolean
          completed_at: string | null
          created_at: string
          dialogue_history: Json
          game_save_id: string
          id: string
          score_grammar: number | null
          score_intent: number | null
          score_tone: number | null
          stat_changes: Json
          stt_responses: Json
          total_score: number | null
        }
        Insert: {
          chapter_number: number
          choices_made?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          dialogue_history?: Json
          game_save_id: string
          id?: string
          score_grammar?: number | null
          score_intent?: number | null
          score_tone?: number | null
          stat_changes?: Json
          stt_responses?: Json
          total_score?: number | null
        }
        Update: {
          chapter_number?: number
          choices_made?: Json
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          dialogue_history?: Json
          game_save_id?: string
          id?: string
          score_grammar?: number | null
          score_intent?: number | null
          score_tone?: number | null
          stat_changes?: Json
          stt_responses?: Json
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_chapter_logs_game_save_id_fkey"
            columns: ["game_save_id"]
            isOneToOne: false
            referencedRelation: "manager_game_saves"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_game_saves: {
        Row: {
          created_at: string
          current_chapter: number
          current_day: number
          ending_type: string | null
          gauge_obsession: number
          gauge_rumor: number
          group_concept: Database["public"]["Enums"]["group_concept"]
          group_gender: Database["public"]["Enums"]["group_gender"]
          group_name: string
          id: string
          money: number
          relationships: Json
          season: number
          stat_chemistry: number
          stat_condition: number
          stat_dance: number
          stat_fandom_power: number
          stat_media_tone: number
          stat_mental: number
          stat_variety: number
          stat_vocal: number
          story_flags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_chapter?: number
          current_day?: number
          ending_type?: string | null
          gauge_obsession?: number
          gauge_rumor?: number
          group_concept?: Database["public"]["Enums"]["group_concept"]
          group_gender?: Database["public"]["Enums"]["group_gender"]
          group_name?: string
          id?: string
          money?: number
          relationships?: Json
          season?: number
          stat_chemistry?: number
          stat_condition?: number
          stat_dance?: number
          stat_fandom_power?: number
          stat_media_tone?: number
          stat_mental?: number
          stat_variety?: number
          stat_vocal?: number
          story_flags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_chapter?: number
          current_day?: number
          ending_type?: string | null
          gauge_obsession?: number
          gauge_rumor?: number
          group_concept?: Database["public"]["Enums"]["group_concept"]
          group_gender?: Database["public"]["Enums"]["group_gender"]
          group_name?: string
          id?: string
          money?: number
          relationships?: Json
          season?: number
          stat_chemistry?: number
          stat_condition?: number
          stat_dance?: number
          stat_fandom_power?: number
          stat_media_tone?: number
          stat_mental?: number
          stat_variety?: number
          stat_vocal?: number
          story_flags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          hp: number
          id: string
          last_daily_bonus: string | null
          missions_completed: number
          money: number
          points: number
          total_missions: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          hp?: number
          id: string
          last_daily_bonus?: string | null
          missions_completed?: number
          money?: number
          points?: number
          total_missions?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          hp?: number
          id?: string
          last_daily_bonus?: string | null
          missions_completed?: number
          money?: number
          points?: number
          total_missions?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      quiz_history: {
        Row: {
          created_at: string
          difficulty: string
          expression: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty: string
          expression: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string
          expression?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_old_quiz_history: { Args: never; Returns: undefined }
      increment_cache_hit: { Args: { p_id: string }; Returns: undefined }
    }
    Enums: {
      group_concept: "fresh" | "crush" | "hiphop" | "retro" | "dark" | "band"
      group_gender: "male" | "female" | "mixed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      group_concept: ["fresh", "crush", "hiphop", "retro", "dark", "band"],
      group_gender: ["male", "female", "mixed"],
    },
  },
} as const
