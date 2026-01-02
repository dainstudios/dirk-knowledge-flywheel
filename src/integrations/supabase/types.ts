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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      images: {
        Row: {
          chart_type: string | null
          colors: string[] | null
          created_at: string | null
          dain_context: string | null
          data_points: string[] | null
          description: string | null
          embedding: string | null
          file_size: number | null
          filename: string | null
          fts: unknown
          google_drive_id: string | null
          google_drive_url: string | null
          height: number | null
          id: string
          key_insight: string | null
          knowledge_item_id: string | null
          limitations: string | null
          mime_type: string | null
          processed_at: string | null
          processing_error: string | null
          source_attribution: string | null
          status: string | null
          storage_path: string | null
          storage_url: string | null
          text_content: string | null
          title: string | null
          topic_tags: string[] | null
          trends_and_patterns: string[] | null
          updated_at: string | null
          use_cases: string[] | null
          user_id: string | null
          visual_style: string | null
          width: number | null
        }
        Insert: {
          chart_type?: string | null
          colors?: string[] | null
          created_at?: string | null
          dain_context?: string | null
          data_points?: string[] | null
          description?: string | null
          embedding?: string | null
          file_size?: number | null
          filename?: string | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          height?: number | null
          id?: string
          key_insight?: string | null
          knowledge_item_id?: string | null
          limitations?: string | null
          mime_type?: string | null
          processed_at?: string | null
          processing_error?: string | null
          source_attribution?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          text_content?: string | null
          title?: string | null
          topic_tags?: string[] | null
          trends_and_patterns?: string[] | null
          updated_at?: string | null
          use_cases?: string[] | null
          user_id?: string | null
          visual_style?: string | null
          width?: number | null
        }
        Update: {
          chart_type?: string | null
          colors?: string[] | null
          created_at?: string | null
          dain_context?: string | null
          data_points?: string[] | null
          description?: string | null
          embedding?: string | null
          file_size?: number | null
          filename?: string | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          height?: number | null
          id?: string
          key_insight?: string | null
          knowledge_item_id?: string | null
          limitations?: string | null
          mime_type?: string | null
          processed_at?: string | null
          processing_error?: string | null
          source_attribution?: string | null
          status?: string | null
          storage_path?: string | null
          storage_url?: string | null
          text_content?: string | null
          title?: string | null
          topic_tags?: string[] | null
          trends_and_patterns?: string[] | null
          updated_at?: string | null
          use_cases?: string[] | null
          user_id?: string | null
          visual_style?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      import_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          filename: string
          google_drive_file_id: string
          google_drive_url: string | null
          id: string
          import_batch_id: string | null
          knowledge_item_id: string | null
          mime_type: string | null
          retry_count: number | null
          source_folder_id: string | null
          source_folder_path: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          filename: string
          google_drive_file_id: string
          google_drive_url?: string | null
          id?: string
          import_batch_id?: string | null
          knowledge_item_id?: string | null
          mime_type?: string | null
          retry_count?: number | null
          source_folder_id?: string | null
          source_folder_path?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          filename?: string
          google_drive_file_id?: string
          google_drive_url?: string | null
          id?: string
          import_batch_id?: string | null
          knowledge_item_id?: string | null
          mime_type?: string | null
          retry_count?: number | null
          source_folder_id?: string | null
          source_folder_path?: string | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_queue_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_items: {
        Row: {
          actionability: string | null
          author: string | null
          author_organization: string | null
          business_functions: string[] | null
          capture_source: string
          content: string | null
          content_type: string | null
          context: string | null
          context_string: string | null
          created_at: string
          curated_at: string | null
          curator_notes: string | null
          dain_context: string | null
          dain_relevance: string | null
          embedding: string | null
          fast_track: boolean | null
          fts: unknown
          google_drive_id: string | null
          google_drive_url: string | null
          highlighted_findings: number[] | null
          highlighted_quotes: number[] | null
          id: string
          import_queue_id: string | null
          import_source: string | null
          industries: string[] | null
          infographic_generated_at: string | null
          infographic_style: string | null
          infographic_type: string | null
          infographic_url: string | null
          key_findings: string[] | null
          key_insights: string[] | null
          methodology: string | null
          newsletter_edition_id: string | null
          newsletter_included_at: string | null
          newsletter_take: string | null
          pdf_data: string | null
          pdf_filename: string | null
          pdf_storage_path: string | null
          processed_at: string | null
          publication_date: string | null
          queued_for_linkedin: boolean | null
          queued_for_linkedin_at: string | null
          queued_for_newsletter: boolean | null
          queued_for_newsletter_at: string | null
          queued_for_team: boolean | null
          quotables: string[] | null
          service_lines: string[] | null
          shared_to_team: boolean | null
          shared_to_team_at: string | null
          source_credibility: string | null
          status: string
          summary: string | null
          technologies: string[] | null
          timeliness: string | null
          title: string
          updated_at: string
          url: string | null
          url_normalized: string | null
          user_id: string
          user_notes: string | null
          video_duration_seconds: number | null
          video_speakers: string[] | null
          video_thumbnail_url: string | null
        }
        Insert: {
          actionability?: string | null
          author?: string | null
          author_organization?: string | null
          business_functions?: string[] | null
          capture_source?: string
          content?: string | null
          content_type?: string | null
          context?: string | null
          context_string?: string | null
          created_at?: string
          curated_at?: string | null
          curator_notes?: string | null
          dain_context?: string | null
          dain_relevance?: string | null
          embedding?: string | null
          fast_track?: boolean | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          highlighted_findings?: number[] | null
          highlighted_quotes?: number[] | null
          id?: string
          import_queue_id?: string | null
          import_source?: string | null
          industries?: string[] | null
          infographic_generated_at?: string | null
          infographic_style?: string | null
          infographic_type?: string | null
          infographic_url?: string | null
          key_findings?: string[] | null
          key_insights?: string[] | null
          methodology?: string | null
          newsletter_edition_id?: string | null
          newsletter_included_at?: string | null
          newsletter_take?: string | null
          pdf_data?: string | null
          pdf_filename?: string | null
          pdf_storage_path?: string | null
          processed_at?: string | null
          publication_date?: string | null
          queued_for_linkedin?: boolean | null
          queued_for_linkedin_at?: string | null
          queued_for_newsletter?: boolean | null
          queued_for_newsletter_at?: string | null
          queued_for_team?: boolean | null
          quotables?: string[] | null
          service_lines?: string[] | null
          shared_to_team?: boolean | null
          shared_to_team_at?: string | null
          source_credibility?: string | null
          status?: string
          summary?: string | null
          technologies?: string[] | null
          timeliness?: string | null
          title: string
          updated_at?: string
          url?: string | null
          url_normalized?: string | null
          user_id: string
          user_notes?: string | null
          video_duration_seconds?: number | null
          video_speakers?: string[] | null
          video_thumbnail_url?: string | null
        }
        Update: {
          actionability?: string | null
          author?: string | null
          author_organization?: string | null
          business_functions?: string[] | null
          capture_source?: string
          content?: string | null
          content_type?: string | null
          context?: string | null
          context_string?: string | null
          created_at?: string
          curated_at?: string | null
          curator_notes?: string | null
          dain_context?: string | null
          dain_relevance?: string | null
          embedding?: string | null
          fast_track?: boolean | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          highlighted_findings?: number[] | null
          highlighted_quotes?: number[] | null
          id?: string
          import_queue_id?: string | null
          import_source?: string | null
          industries?: string[] | null
          infographic_generated_at?: string | null
          infographic_style?: string | null
          infographic_type?: string | null
          infographic_url?: string | null
          key_findings?: string[] | null
          key_insights?: string[] | null
          methodology?: string | null
          newsletter_edition_id?: string | null
          newsletter_included_at?: string | null
          newsletter_take?: string | null
          pdf_data?: string | null
          pdf_filename?: string | null
          pdf_storage_path?: string | null
          processed_at?: string | null
          publication_date?: string | null
          queued_for_linkedin?: boolean | null
          queued_for_linkedin_at?: string | null
          queued_for_newsletter?: boolean | null
          queued_for_newsletter_at?: string | null
          queued_for_team?: boolean | null
          quotables?: string[] | null
          service_lines?: string[] | null
          shared_to_team?: boolean | null
          shared_to_team_at?: string | null
          source_credibility?: string | null
          status?: string
          summary?: string | null
          technologies?: string[] | null
          timeliness?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          url_normalized?: string | null
          user_id?: string
          user_notes?: string | null
          video_duration_seconds?: number | null
          video_speakers?: string[] | null
          video_thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_items_import_queue_id_fkey"
            columns: ["import_queue_id"]
            isOneToOne: false
            referencedRelation: "import_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      model_usage_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          edge_function: string
          error_message: string | null
          id: string
          item_id: string | null
          model_used: string
          success: boolean | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          edge_function: string
          error_message?: string | null
          id?: string
          item_id?: string | null
          model_used: string
          success?: boolean | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          edge_function?: string
          error_message?: string | null
          id?: string
          item_id?: string | null
          model_used?: string
          success?: boolean | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_items: number
          id: string
          job_type: string
          processed_items: number
          started_at: string | null
          status: string
          total_items: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_items?: number
          id?: string
          job_type: string
          processed_items?: number
          started_at?: string | null
          status?: string
          total_items?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_items?: number
          id?: string
          job_type?: string
          processed_items?: number
          started_at?: string | null
          status?: string
          total_items?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          knowledge_item_id: string | null
          quote_text: string
          source_author: string | null
          source_title: string | null
          source_url: string | null
          tone: string | null
          topic_tags: string[] | null
          use_cases: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          knowledge_item_id?: string | null
          quote_text: string
          source_author?: string | null
          source_title?: string | null
          source_url?: string | null
          tone?: string | null
          topic_tags?: string[] | null
          use_cases?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          knowledge_item_id?: string | null
          quote_text?: string
          source_author?: string | null
          source_title?: string | null
          source_url?: string | null
          tone?: string | null
          topic_tags?: string[] | null
          use_cases?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_knowledge_item_id_fkey"
            columns: ["knowledge_item_id"]
            isOneToOne: false
            referencedRelation: "knowledge_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      import_progress: {
        Row: {
          completed: number | null
          completion_percentage: number | null
          failed: number | null
          import_batch_id: string | null
          last_completed_at: string | null
          pending: number | null
          processing: number | null
          skipped: number | null
          started_at: string | null
          total_files: number | null
        }
        Relationships: []
      }
      model_usage_summary: {
        Row: {
          avg_duration_ms: number | null
          call_count: number | null
          edge_function: string | null
          error_count: number | null
          model_used: string | null
          success_count: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_youtube_id: { Args: { url: string }; Returns: string }
      get_knowledge_stats: {
        Args: never
        Returns: {
          knowledge_count: number
          linkedin_queue: number
          newsletter_queue: number
          pending_count: number
          pool_count: number
          total_items: number
        }[]
      }
      get_next_import_batch: {
        Args: { batch_size?: number }
        Returns: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_size_bytes: number | null
          filename: string
          google_drive_file_id: string
          google_drive_url: string | null
          id: string
          import_batch_id: string | null
          knowledge_item_id: string | null
          mime_type: string | null
          retry_count: number | null
          source_folder_id: string | null
          source_folder_path: string | null
          started_at: string | null
          status: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "import_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pending_count: { Args: never; Returns: number }
      get_pool_count: { Args: never; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_or_higher: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search: {
        Args: {
          full_text_weight?: number
          match_count?: number
          query_embedding: string
          query_text: string
          rrf_k?: number
          semantic_weight?: number
        }
        Returns: {
          dain_context: string
          id: string
          score: number
          summary: string
          title: string
          url: string
        }[]
      }
      match_images: {
        Args: {
          filter_chart_type?: string
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chart_type: string
          description: string
          id: string
          knowledge_item_id: string
          similarity: number
          source_attribution: string
          storage_url: string
          title: string
          topic_tags: string[]
          use_cases: string[]
        }[]
      }
      match_knowledge: {
        Args: {
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_type: string
          dain_context: string
          google_drive_url: string
          id: string
          industries: string[]
          quotables: string[]
          similarity: number
          summary: string
          title: string
          url: string
        }[]
      }
      match_quotes: {
        Args: {
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          quote_text: string
          similarity: number
          source_author: string
          source_title: string
          source_url: string
          tone: string
          topic_tags: string[]
          use_cases: string[]
        }[]
      }
      normalize_url: { Args: { raw_url: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "creator" | "contributor" | "viewer"
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
      app_role: ["admin", "creator", "contributor", "viewer"],
    },
  },
} as const
