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
      board_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "board_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "board_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_posts: {
        Row: {
          attachment_urls: string[] | null
          audio_url: string | null
          author_id: string | null
          author_name: string | null
          board_type: Database["public"]["Enums"]["board_type"]
          comment_count: number | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          title: string
          updated_at: string
          view_count: number | null
          youtube_urls: string[] | null
        }
        Insert: {
          attachment_urls?: string[] | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string | null
          board_type: Database["public"]["Enums"]["board_type"]
          comment_count?: number | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          title: string
          updated_at?: string
          view_count?: number | null
          youtube_urls?: string[] | null
        }
        Update: {
          attachment_urls?: string[] | null
          audio_url?: string | null
          author_id?: string | null
          author_name?: string | null
          board_type?: Database["public"]["Enums"]["board_type"]
          comment_count?: number | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          title?: string
          updated_at?: string
          view_count?: number | null
          youtube_urls?: string[] | null
        }
        Relationships: []
      }
      board_reports: {
        Row: {
          admin_notes: string | null
          comment_id: string | null
          created_at: string
          description: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          comment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "board_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_reaction_moves: {
        Row: {
          chain_length: number
          connection_mode: string
          created_at: string
          id: string
          player_id: string
          player_name: string
          room_id: string
          score_delta: number
          word: string
        }
        Insert: {
          chain_length?: number
          connection_mode?: string
          created_at?: string
          id?: string
          player_id: string
          player_name: string
          room_id: string
          score_delta?: number
          word: string
        }
        Update: {
          chain_length?: number
          connection_mode?: string
          created_at?: string
          id?: string
          player_id?: string
          player_name?: string
          room_id?: string
          score_delta?: number
          word?: string
        }
        Relationships: []
      }
      chain_reaction_rooms: {
        Row: {
          connection_mode: string
          created_at: string
          current_turn_player_id: string | null
          finished_at: string | null
          guest_chain_length: number | null
          guest_id: string | null
          guest_name: string | null
          guest_ready: boolean | null
          guest_score: number | null
          guest_warnings: number
          host_chain_length: number | null
          host_id: string
          host_name: string
          host_ready: boolean | null
          host_score: number | null
          host_warnings: number
          id: string
          room_code: string
          started_at: string | null
          status: string
          turn_start_at: string | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          connection_mode?: string
          created_at?: string
          current_turn_player_id?: string | null
          finished_at?: string | null
          guest_chain_length?: number | null
          guest_id?: string | null
          guest_name?: string | null
          guest_ready?: boolean | null
          guest_score?: number | null
          guest_warnings?: number
          host_chain_length?: number | null
          host_id: string
          host_name?: string
          host_ready?: boolean | null
          host_score?: number | null
          host_warnings?: number
          id?: string
          room_code: string
          started_at?: string | null
          status?: string
          turn_start_at?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          connection_mode?: string
          created_at?: string
          current_turn_player_id?: string | null
          finished_at?: string | null
          guest_chain_length?: number | null
          guest_id?: string | null
          guest_name?: string | null
          guest_ready?: boolean | null
          guest_score?: number | null
          guest_warnings?: number
          host_chain_length?: number | null
          host_id?: string
          host_name?: string
          host_ready?: boolean | null
          host_score?: number | null
          host_warnings?: number
          id?: string
          room_code?: string
          started_at?: string | null
          status?: string
          turn_start_at?: string | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      cloze_questions: {
        Row: {
          blank_word: string
          created_at: string
          difficulty: string | null
          hint: string | null
          id: string
          level: number
          sentence: string
          vocabulary_id: string | null
          wrong_answer: string
        }
        Insert: {
          blank_word: string
          created_at?: string
          difficulty?: string | null
          hint?: string | null
          id?: string
          level: number
          sentence: string
          vocabulary_id?: string | null
          wrong_answer: string
        }
        Update: {
          blank_word?: string
          created_at?: string
          difficulty?: string | null
          hint?: string | null
          id?: string
          level?: number
          sentence?: string
          vocabulary_id?: string | null
          wrong_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloze_questions_vocabulary_id_fkey"
            columns: ["vocabulary_id"]
            isOneToOne: false
            referencedRelation: "topik_vocabulary"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_records: {
        Row: {
          created_at: string
          game_type: string
          id: string
          my_score: number | null
          opponent_id: string | null
          opponent_name: string | null
          opponent_score: number | null
          played_at: string
          result: string
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          my_score?: number | null
          opponent_id?: string | null
          opponent_name?: string | null
          opponent_score?: number | null
          played_at?: string
          result: string
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          my_score?: number | null
          opponent_id?: string | null
          opponent_name?: string | null
          opponent_score?: number | null
          played_at?: string
          result?: string
          room_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grammar_ox_questions: {
        Row: {
          created_at: string
          difficulty: string | null
          explanation: string
          explanation_vi: string | null
          grammar_point: string | null
          id: string
          is_correct: boolean
          level: number
          statement: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          explanation: string
          explanation_vi?: string | null
          grammar_point?: string | null
          id?: string
          is_correct: boolean
          level: number
          statement: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          explanation?: string
          explanation_vi?: string | null
          grammar_point?: string | null
          id?: string
          is_correct?: boolean
          level?: number
          statement?: string
        }
        Relationships: []
      }
      hanja_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          topic_en: string | null
          topic_ko: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          topic_en?: string | null
          topic_ko: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          topic_en?: string | null
          topic_ko?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hanja_days_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "hanja_units"
            referencedColumns: ["id"]
          },
        ]
      }
      hanja_learning_progress: {
        Row: {
          completed: boolean
          created_at: string
          day_id: string | null
          id: string
          last_studied_at: string | null
          mastered_words: number
          total_words: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          day_id?: string | null
          id?: string
          last_studied_at?: string | null
          mastered_words?: number
          total_words?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          day_id?: string | null
          id?: string
          last_studied_at?: string | null
          mastered_words?: number
          total_words?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hanja_learning_progress_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "hanja_days"
            referencedColumns: ["id"]
          },
        ]
      }
      hanja_mastered_words: {
        Row: {
          id: string
          mastered_at: string
          user_id: string
          word_id: string | null
        }
        Insert: {
          id?: string
          mastered_at?: string
          user_id: string
          word_id?: string | null
        }
        Update: {
          id?: string
          mastered_at?: string
          user_id?: string
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hanja_mastered_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "hanja_words"
            referencedColumns: ["id"]
          },
        ]
      }
      hanja_roots: {
        Row: {
          created_at: string
          day_id: string | null
          display_order: number
          hanja: string
          id: string
          meaning_en: string | null
          meaning_ja: string | null
          meaning_ko: string
          meaning_vi: string | null
          meaning_zh: string | null
          reading_ko: string
        }
        Insert: {
          created_at?: string
          day_id?: string | null
          display_order?: number
          hanja: string
          id?: string
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ko: string
          meaning_vi?: string | null
          meaning_zh?: string | null
          reading_ko: string
        }
        Update: {
          created_at?: string
          day_id?: string | null
          display_order?: number
          hanja?: string
          id?: string
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ko?: string
          meaning_vi?: string | null
          meaning_zh?: string | null
          reading_ko?: string
        }
        Relationships: [
          {
            foreignKeyName: "hanja_roots_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "hanja_days"
            referencedColumns: ["id"]
          },
        ]
      }
      hanja_units: {
        Row: {
          created_at: string
          id: string
          title_en: string | null
          title_ko: string
          unit_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          title_en?: string | null
          title_ko: string
          unit_number: number
        }
        Update: {
          created_at?: string
          id?: string
          title_en?: string | null
          title_ko?: string
          unit_number?: number
        }
        Relationships: []
      }
      hanja_words: {
        Row: {
          created_at: string
          display_order: number
          id: string
          meaning_en: string | null
          meaning_ja: string | null
          meaning_ko: string | null
          meaning_vi: string | null
          meaning_zh: string | null
          root_id: string | null
          word: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ko?: string | null
          meaning_vi?: string | null
          meaning_zh?: string | null
          root_id?: string | null
          word: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ko?: string | null
          meaning_vi?: string | null
          meaning_zh?: string | null
          root_id?: string | null
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "hanja_words_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "hanja_roots"
            referencedColumns: ["id"]
          },
        ]
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
      mock_exam_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          time_spent_seconds: number | null
          user_answer: number | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          time_spent_seconds?: number | null
          user_answer?: number | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          time_spent_seconds?: number | null
          user_answer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_attempts: {
        Row: {
          correct_count: number
          created_at: string
          exam_mode: string
          exam_type: string
          finished_at: string | null
          id: string
          is_completed: boolean
          listening_score: number | null
          part_number: number | null
          predicted_grade: number | null
          reading_score: number | null
          section: string | null
          started_at: string
          time_limit_seconds: number | null
          time_taken_seconds: number | null
          total_questions: number
          total_score: number | null
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          exam_mode: string
          exam_type: string
          finished_at?: string | null
          id?: string
          is_completed?: boolean
          listening_score?: number | null
          part_number?: number | null
          predicted_grade?: number | null
          reading_score?: number | null
          section?: string | null
          started_at?: string
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions: number
          total_score?: number | null
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          exam_mode?: string
          exam_type?: string
          finished_at?: string | null
          id?: string
          is_completed?: boolean
          listening_score?: number | null
          part_number?: number | null
          predicted_grade?: number | null
          reading_score?: number | null
          section?: string | null
          started_at?: string
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions?: number
          total_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mock_exam_mistakes: {
        Row: {
          ai_analysis: string | null
          attempt_id: string | null
          created_at: string
          id: string
          last_reviewed: string | null
          mastered: boolean
          mastered_at: string | null
          mistake_category: string | null
          next_review: string | null
          question_id: string
          review_count: number
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          ai_analysis?: string | null
          attempt_id?: string | null
          created_at?: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean
          mastered_at?: string | null
          mistake_category?: string | null
          next_review?: string | null
          question_id: string
          review_count?: number
          updated_at?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          ai_analysis?: string | null
          attempt_id?: string | null
          created_at?: string
          id?: string
          last_reviewed?: string | null
          mastered?: boolean
          mastered_at?: string | null
          mistake_category?: string | null
          next_review?: string | null
          question_id?: string
          review_count?: number
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_mistakes_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_mistakes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_question_bank: {
        Row: {
          ai_validation_notes: string | null
          approved_at: string | null
          approved_by: string | null
          correct_answer: number
          created_at: string
          created_by: string | null
          difficulty: string | null
          exam_round: number | null
          exam_type: string
          exam_year: number | null
          explanation_en: string | null
          explanation_ja: string | null
          explanation_ko: string | null
          explanation_ru: string | null
          explanation_uz: string | null
          explanation_vi: string | null
          explanation_zh: string | null
          generation_source: string | null
          grammar_points: Json | null
          id: string
          instruction_text: string | null
          is_active: boolean
          option_images: Json | null
          options: Json
          part_number: number
          point_value: number | null
          question_audio_url: string | null
          question_image_url: string | null
          question_number: number | null
          question_text: string
          reference_doc_url: string | null
          section: string
          status: string | null
          template_id: string | null
          topic: string | null
          updated_at: string
          usage_count: number
          vocabulary: Json | null
        }
        Insert: {
          ai_validation_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          correct_answer: number
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_round?: number | null
          exam_type: string
          exam_year?: number | null
          explanation_en?: string | null
          explanation_ja?: string | null
          explanation_ko?: string | null
          explanation_ru?: string | null
          explanation_uz?: string | null
          explanation_vi?: string | null
          explanation_zh?: string | null
          generation_source?: string | null
          grammar_points?: Json | null
          id?: string
          instruction_text?: string | null
          is_active?: boolean
          option_images?: Json | null
          options?: Json
          part_number: number
          point_value?: number | null
          question_audio_url?: string | null
          question_image_url?: string | null
          question_number?: number | null
          question_text: string
          reference_doc_url?: string | null
          section: string
          status?: string | null
          template_id?: string | null
          topic?: string | null
          updated_at?: string
          usage_count?: number
          vocabulary?: Json | null
        }
        Update: {
          ai_validation_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          exam_round?: number | null
          exam_type?: string
          exam_year?: number | null
          explanation_en?: string | null
          explanation_ja?: string | null
          explanation_ko?: string | null
          explanation_ru?: string | null
          explanation_uz?: string | null
          explanation_vi?: string | null
          explanation_zh?: string | null
          generation_source?: string | null
          grammar_points?: Json | null
          id?: string
          instruction_text?: string | null
          is_active?: boolean
          option_images?: Json | null
          options?: Json
          part_number?: number
          point_value?: number | null
          question_audio_url?: string | null
          question_image_url?: string | null
          question_number?: number | null
          question_text?: string
          reference_doc_url?: string | null
          section?: string
          status?: string | null
          template_id?: string | null
          topic?: string | null
          updated_at?: string
          usage_count?: number
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_question_bank_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mock_question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_question_templates: {
        Row: {
          created_at: string
          description: string | null
          description_ko: string | null
          description_vi: string | null
          difficulty: string | null
          display_order: number
          exam_type: string
          examples: Json | null
          generation_hints: Json | null
          id: string
          is_active: boolean
          part_name: string
          part_name_ko: string | null
          part_name_vi: string | null
          part_number: number
          question_count: number
          section: string
          time_limit_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ko?: string | null
          description_vi?: string | null
          difficulty?: string | null
          display_order?: number
          exam_type: string
          examples?: Json | null
          generation_hints?: Json | null
          id?: string
          is_active?: boolean
          part_name: string
          part_name_ko?: string | null
          part_name_vi?: string | null
          part_number: number
          question_count?: number
          section: string
          time_limit_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ko?: string | null
          description_vi?: string | null
          difficulty?: string | null
          display_order?: number
          exam_type?: string
          examples?: Json | null
          generation_hints?: Json | null
          id?: string
          is_active?: boolean
          part_name?: string
          part_name_ko?: string | null
          part_name_vi?: string | null
          part_number?: number
          question_count?: number
          section?: string
          time_limit_minutes?: number | null
          updated_at?: string
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
          avatar_url: string | null
          battle_draws: number
          battle_losses: number
          battle_wins: number
          created_at: string
          current_streak: number
          hp: number
          id: string
          last_daily_bonus: string | null
          longest_streak: number
          max_win_streak: number
          missions_completed: number
          money: number
          points: number
          total_missions: number
          updated_at: string
          username: string
          win_streak: number
        }
        Insert: {
          avatar_url?: string | null
          battle_draws?: number
          battle_losses?: number
          battle_wins?: number
          created_at?: string
          current_streak?: number
          hp?: number
          id: string
          last_daily_bonus?: string | null
          longest_streak?: number
          max_win_streak?: number
          missions_completed?: number
          money?: number
          points?: number
          total_missions?: number
          updated_at?: string
          username: string
          win_streak?: number
        }
        Update: {
          avatar_url?: string | null
          battle_draws?: number
          battle_losses?: number
          battle_wins?: number
          created_at?: string
          current_streak?: number
          hp?: number
          id?: string
          last_daily_bonus?: string | null
          longest_streak?: number
          max_win_streak?: number
          missions_completed?: number
          money?: number
          points?: number
          total_missions?: number
          updated_at?: string
          username?: string
          win_streak?: number
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
      speed_quiz_room_answers: {
        Row: {
          answered_at: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_number: number
          room_id: string
          score_delta: number
          selected_index: number | null
          time_left_seconds: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_number: number
          room_id: string
          score_delta?: number
          selected_index?: number | null
          time_left_seconds?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_number?: number
          room_id?: string
          score_delta?: number
          selected_index?: number | null
          time_left_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      speed_quiz_room_questions: {
        Row: {
          created_at: string
          id: string
          question: Json
          question_number: number
          room_id: string
          started_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question: Json
          question_number: number
          room_id: string
          started_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question?: Json
          question_number?: number
          room_id?: string
          started_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          rating: number
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          rating?: number
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          rating?: number
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      topik_idioms: {
        Row: {
          actual_meaning: string
          actual_meaning_vi: string | null
          created_at: string
          difficulty: string | null
          id: string
          idiom: string
          level: number
          literal_meaning: string
          similar_expressions: string[] | null
          situation_example: string | null
        }
        Insert: {
          actual_meaning: string
          actual_meaning_vi?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          idiom: string
          level: number
          literal_meaning: string
          similar_expressions?: string[] | null
          situation_example?: string | null
        }
        Update: {
          actual_meaning?: string
          actual_meaning_vi?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          idiom?: string
          level?: number
          literal_meaning?: string
          similar_expressions?: string[] | null
          situation_example?: string | null
        }
        Relationships: []
      }
      topik_vocabulary: {
        Row: {
          created_at: string
          difficulty: string | null
          example_phrase: string | null
          example_sentence: string | null
          example_sentence_vi: string | null
          id: string
          level: number
          level_seq: number | null
          meaning_en: string | null
          meaning_ja: string | null
          meaning_ru: string | null
          meaning_uz: string | null
          meaning_vi: string | null
          meaning_zh: string | null
          pos: string | null
          seq_no: number
          word: string
          word_code: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          example_phrase?: string | null
          example_sentence?: string | null
          example_sentence_vi?: string | null
          id?: string
          level: number
          level_seq?: number | null
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ru?: string | null
          meaning_uz?: string | null
          meaning_vi?: string | null
          meaning_zh?: string | null
          pos?: string | null
          seq_no: number
          word: string
          word_code?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          example_phrase?: string | null
          example_sentence?: string | null
          example_sentence_vi?: string | null
          id?: string
          level?: number
          level_seq?: number | null
          meaning_en?: string | null
          meaning_ja?: string | null
          meaning_ru?: string | null
          meaning_uz?: string | null
          meaning_vi?: string | null
          meaning_zh?: string | null
          pos?: string | null
          seq_no?: number
          word?: string
          word_code?: string | null
        }
        Relationships: []
      }
      user_mistakes: {
        Row: {
          created_at: string
          id: string
          item_data: Json
          item_id: string
          item_type: string
          last_reviewed: string | null
          mastered: boolean
          mistake_count: number
          next_review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_data?: Json
          item_id: string
          item_type: string
          last_reviewed?: string | null
          mastered?: boolean
          mistake_count?: number
          next_review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_data?: Json
          item_id?: string
          item_type?: string
          last_reviewed?: string | null
          mastered?: boolean
          mistake_count?: number
          next_review?: string | null
          updated_at?: string
          user_id?: string
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
      video_learning_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          last_position_seconds: number
          quiz_score: number | null
          shadowing_attempts: number
          total_watches: number
          updated_at: string
          user_id: string
          video_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          quiz_score?: number | null
          shadowing_attempts?: number
          total_watches?: number
          updated_at?: string
          user_id: string
          video_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          last_position_seconds?: number
          quiz_score?: number | null
          shadowing_attempts?: number
          total_watches?: number
          updated_at?: string
          user_id?: string
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_learning_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_lessons: {
        Row: {
          category: string
          created_at: string
          description: string | null
          difficulty: string
          duration_seconds: number | null
          id: string
          is_published: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number
          youtube_id: string
          youtube_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
          youtube_id: string
          youtube_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_seconds?: number | null
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
          youtube_id?: string
          youtube_url?: string
        }
        Relationships: []
      }
      video_mistakes: {
        Row: {
          context_sentence: string | null
          created_at: string
          id: string
          mastered: boolean
          mistake_count: number
          notes: string | null
          subtitle_index: number
          timestamp_end: number
          timestamp_start: number
          updated_at: string
          user_id: string
          video_id: string
          word: string
          word_meaning: string | null
        }
        Insert: {
          context_sentence?: string | null
          created_at?: string
          id?: string
          mastered?: boolean
          mistake_count?: number
          notes?: string | null
          subtitle_index: number
          timestamp_end: number
          timestamp_start: number
          updated_at?: string
          user_id: string
          video_id: string
          word: string
          word_meaning?: string | null
        }
        Update: {
          context_sentence?: string | null
          created_at?: string
          id?: string
          mastered?: boolean
          mistake_count?: number
          notes?: string | null
          subtitle_index?: number
          timestamp_end?: number
          timestamp_start?: number
          updated_at?: string
          user_id?: string
          video_id?: string
          word?: string
          word_meaning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_mistakes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_subtitles: {
        Row: {
          created_at: string
          id: string
          is_reviewed: boolean
          language: string
          subtitles: Json
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_reviewed?: boolean
          language?: string
          subtitles?: Json
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_reviewed?: boolean
          language?: string
          subtitles?: Json
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_subtitles_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_corrections: {
        Row: {
          answer_image_url: string | null
          answer_text: string | null
          content_hash: string | null
          correction_report: Json
          created_at: string
          id: string
          is_cached: boolean | null
          question_image_url: string | null
          question_text: string | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_image_url?: string | null
          answer_text?: string | null
          content_hash?: string | null
          correction_report?: Json
          created_at?: string
          id?: string
          is_cached?: boolean | null
          question_image_url?: string | null
          question_text?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_image_url?: string | null
          answer_text?: string | null
          content_hash?: string | null
          correction_report?: Json
          created_at?: string
          id?: string
          is_cached?: boolean | null
          question_image_url?: string | null
          question_text?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_free_usage: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
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
      can_use_feature: {
        Args: { _feature_name: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_old_quiz_history: { Args: never; Returns: undefined }
      get_feature_cooldown: {
        Args: { _feature_name: string; _user_id: string }
        Returns: number
      }
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
      record_feature_usage: {
        Args: { _feature_name: string; _user_id: string }
        Returns: undefined
      }
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
      board_type: "notice" | "free" | "resource" | "anonymous" | "podcast"
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
      board_type: ["notice", "free", "resource", "anonymous", "podcast"],
      group_concept: ["fresh", "crush", "hiphop", "retro", "dark", "band"],
      group_gender: ["male", "female", "mixed"],
      subscription_plan: ["free", "plus", "premium"],
    },
  },
} as const
