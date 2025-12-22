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
      ai_question_usage: {
        Row: {
          created_at: string
          id: string
          last_reset_at: string
          question_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reset_at?: string
          question_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reset_at?: string
          question_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      headhunting_applications: {
        Row: {
          additional_skills: string | null
          admin_notes: string | null
          available_start_date: string | null
          birth_year: number | null
          career_goals: string | null
          cover_letter_url: string | null
          created_at: string
          current_company: string | null
          current_job_title: string | null
          desired_industry: string | null
          desired_job_type: string | null
          desired_location: string | null
          desired_salary_range: string | null
          education_level: string | null
          email: string
          full_name: string
          graduation_year: number | null
          id: string
          introduction: string | null
          korean_certificate_other: string | null
          major: string | null
          nationality: string | null
          phone: string | null
          portfolio_url: string | null
          resume_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          strengths: string | null
          topik_level: number | null
          university_name: string | null
          updated_at: string
          user_id: string
          work_experience_details: string | null
          work_experience_years: number | null
        }
        Insert: {
          additional_skills?: string | null
          admin_notes?: string | null
          available_start_date?: string | null
          birth_year?: number | null
          career_goals?: string | null
          cover_letter_url?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          desired_industry?: string | null
          desired_job_type?: string | null
          desired_location?: string | null
          desired_salary_range?: string | null
          education_level?: string | null
          email: string
          full_name: string
          graduation_year?: number | null
          id?: string
          introduction?: string | null
          korean_certificate_other?: string | null
          major?: string | null
          nationality?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          strengths?: string | null
          topik_level?: number | null
          university_name?: string | null
          updated_at?: string
          user_id: string
          work_experience_details?: string | null
          work_experience_years?: number | null
        }
        Update: {
          additional_skills?: string | null
          admin_notes?: string | null
          available_start_date?: string | null
          birth_year?: number | null
          career_goals?: string | null
          cover_letter_url?: string | null
          created_at?: string
          current_company?: string | null
          current_job_title?: string | null
          desired_industry?: string | null
          desired_job_type?: string | null
          desired_location?: string | null
          desired_salary_range?: string | null
          education_level?: string | null
          email?: string
          full_name?: string
          graduation_year?: number | null
          id?: string
          introduction?: string | null
          korean_certificate_other?: string | null
          major?: string | null
          nationality?: string | null
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          strengths?: string | null
          topik_level?: number | null
          university_name?: string | null
          updated_at?: string
          user_id?: string
          work_experience_details?: string | null
          work_experience_years?: number | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          file_type: string | null
          id: string
          metadata: Json | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          category: string
          completed: boolean | null
          completed_at: string | null
          correct_count: number | null
          created_at: string
          id: string
          lesson_id: string
          level: number
          score: number | null
          time_spent_seconds: number | null
          total_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          lesson_id: string
          level: number
          score?: number | null
          time_spent_seconds?: number | null
          total_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean | null
          completed_at?: string | null
          correct_count?: number | null
          created_at?: string
          id?: string
          lesson_id?: string
          level?: number
          score?: number | null
          time_spent_seconds?: number | null
          total_count?: number | null
          updated_at?: string
          user_id?: string
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
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean
          message: string
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          message: string
          target_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          message?: string
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_streak: number
          hp: number
          id: string
          last_daily_bonus: string | null
          longest_streak: number
          missions_completed: number
          money: number
          points: number
          total_missions: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          hp?: number
          id: string
          last_daily_bonus?: string | null
          longest_streak?: number
          missions_completed?: number
          money?: number
          points?: number
          total_missions?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          hp?: number
          id?: string
          last_daily_bonus?: string | null
          longest_streak?: number
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
      user_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_corrections: {
        Row: {
          answer_image_url: string | null
          answer_text: string | null
          correction_report: Json
          created_at: string
          id: string
          question_image_url: string | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_image_url?: string | null
          answer_text?: string | null
          correction_report?: Json
          created_at?: string
          id?: string
          question_image_url?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_image_url?: string | null
          answer_text?: string | null
          correction_report?: Json
          created_at?: string
          id?: string
          question_image_url?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cache_hit: { Args: { p_id: string }; Returns: undefined }
      is_plus_or_premium: { Args: { _user_id: string }; Returns: boolean }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      search_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      group_concept: "fresh" | "crush" | "hiphop" | "retro" | "dark" | "band"
      group_gender: "male" | "female" | "mixed"
      subscription_plan: "free" | "plus" | "premium"
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
      app_role: ["admin", "moderator", "user"],
      group_concept: ["fresh", "crush", "hiphop", "retro", "dark", "band"],
      group_gender: ["male", "female", "mixed"],
      subscription_plan: ["free", "plus", "premium"],
    },
  },
} as const
