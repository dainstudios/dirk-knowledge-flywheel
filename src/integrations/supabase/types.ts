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
          created_at: string
          curated_at: string | null
          dain_context: string | null
          dain_relevance: string | null
          embedding: string | null
          fast_track: boolean | null
          fts: unknown
          google_drive_id: string | null
          google_drive_url: string | null
          id: string
          industries: string[] | null
          infographic_generated_at: string | null
          infographic_style: string | null
          infographic_type: string | null
          infographic_url: string | null
          key_findings: string[] | null
          key_insights: string[] | null
          methodology: string | null
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
          created_at?: string
          curated_at?: string | null
          dain_context?: string | null
          dain_relevance?: string | null
          embedding?: string | null
          fast_track?: boolean | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          id?: string
          industries?: string[] | null
          infographic_generated_at?: string | null
          infographic_style?: string | null
          infographic_type?: string | null
          infographic_url?: string | null
          key_findings?: string[] | null
          key_insights?: string[] | null
          methodology?: string | null
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
          created_at?: string
          curated_at?: string | null
          dain_context?: string | null
          dain_relevance?: string | null
          embedding?: string | null
          fast_track?: boolean | null
          fts?: unknown
          google_drive_id?: string | null
          google_drive_url?: string | null
          id?: string
          industries?: string[] | null
          infographic_generated_at?: string | null
          infographic_style?: string | null
          infographic_type?: string | null
          infographic_url?: string | null
          key_findings?: string[] | null
          key_insights?: string[] | null
          methodology?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_pending_count: { Args: never; Returns: number }
      get_pool_count: { Args: never; Returns: number }
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
