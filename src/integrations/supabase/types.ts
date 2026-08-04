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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      candidate_name_edits: {
        Row: {
          candidate_id: string
          created_at: string
          edited_by: string | null
          id: string
          new_name: string
          old_name: string | null
          reason: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          edited_by?: string | null
          id?: string
          new_name: string
          old_name?: string | null
          reason?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          new_name?: string
          old_name?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_name_edits_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          decision_email_kind: string | null
          decision_email_sent_at: string | null
          education_score: number | null
          email: string | null
          error_message: string | null
          experience_score: number | null
          gaps: string[] | null
          id: string
          job_id: string
          matched_skills: string[]
          missing_skills: string[]
          name: string | null
          name_overridden_at: string | null
          overall_score: number | null
          phone: string | null
          processing_status: string
          resume_path: string | null
          resume_quality_issues: string[]
          resume_quality_score: number | null
          resume_text: string | null
          skills_score: number | null
          stage: string
          status: string
          strengths: string[] | null
          summary: string | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          decision_email_kind?: string | null
          decision_email_sent_at?: string | null
          education_score?: number | null
          email?: string | null
          error_message?: string | null
          experience_score?: number | null
          gaps?: string[] | null
          id?: string
          job_id: string
          matched_skills?: string[]
          missing_skills?: string[]
          name?: string | null
          name_overridden_at?: string | null
          overall_score?: number | null
          phone?: string | null
          processing_status?: string
          resume_path?: string | null
          resume_quality_issues?: string[]
          resume_quality_score?: number | null
          resume_text?: string | null
          skills_score?: number | null
          stage?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          decision_email_kind?: string | null
          decision_email_sent_at?: string | null
          education_score?: number | null
          email?: string | null
          error_message?: string | null
          experience_score?: number | null
          gaps?: string[] | null
          id?: string
          job_id?: string
          matched_skills?: string[]
          missing_skills?: string[]
          name?: string | null
          name_overridden_at?: string | null
          overall_score?: number | null
          phone?: string | null
          processing_status?: string
          resume_path?: string | null
          resume_quality_issues?: string[]
          resume_quality_score?: number | null
          resume_text?: string | null
          skills_score?: number | null
          stage?: string
          status?: string
          strengths?: string[] | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          amount_discounted: number | null
          coupon_id: string
          created_at: string
          id: string
          tier_key: string | null
          user_id: string
        }
        Insert: {
          amount_discounted?: number | null
          coupon_id: string
          created_at?: string
          id?: string
          tier_key?: string | null
          user_id: string
        }
        Update: {
          amount_discounted?: number | null
          coupon_id?: string
          created_at?: string
          id?: string
          tier_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to_tiers: string[]
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          headline: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          redemption_count: number
          show_on_home: boolean
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applies_to_tiers?: string[]
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          headline?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          redemption_count?: number
          show_on_home?: boolean
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applies_to_tiers?: string[]
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          headline?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          redemption_count?: number
          show_on_home?: boolean
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          attempts: number
          context: Json | null
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_retry_at: string | null
          provider_status: number | null
          purpose: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          context?: Json | null
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_retry_at?: string | null
          provider_status?: number | null
          purpose: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          context?: Json | null
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_retry_at?: string | null
          provider_status?: number | null
          purpose?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          agent_id: string | null
          candidate_id: string
          conversation_id: string | null
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          job_id: string
          recommendation: string | null
          scores: Json | null
          sentiment: string | null
          started_at: string | null
          status: string
          summary: string | null
          token: string
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          candidate_id: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          job_id: string
          recommendation?: string | null
          scores?: Json | null
          sentiment?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          token?: string
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          candidate_id?: string
          conversation_id?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          job_id?: string
          recommendation?: string | null
          scores?: Json | null
          sentiment?: string | null
          started_at?: string | null
          status?: string
          summary?: string | null
          token?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          candidate_id: string
          created_at: string
          duration_minutes: number
          feedback: string | null
          id: string
          interview_type: string
          interviewer: string | null
          job_id: string
          location: string | null
          notes: string | null
          rating: number | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer?: string | null
          job_id: string
          location?: string | null
          notes?: string | null
          rating?: number | null
          scheduled_at: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer?: string | null
          job_id?: string
          location?: string | null
          notes?: string | null
          rating?: number | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          company_name: string | null
          created_at: string
          description: string
          external_id: string | null
          external_source: string | null
          hr_email: string | null
          id: string
          min_years_experience: number
          required_skills: string[]
          requirements: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          description?: string
          external_id?: string | null
          external_source?: string | null
          hr_email?: string | null
          id?: string
          min_years_experience?: number
          required_skills?: string[]
          requirements?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          description?: string
          external_id?: string | null
          external_source?: string | null
          hr_email?: string | null
          id?: string
          min_years_experience?: number
          required_skills?: string[]
          requirements?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          notes: string | null
          responded_at: string | null
          salary_amount: number | null
          salary_currency: string
          sent_at: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          responded_at?: string | null
          salary_amount?: number | null
          salary_currency?: string
          sent_at?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          responded_at?: string | null
          salary_amount?: number | null
          salary_currency?: string
          sent_at?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_tasks: {
        Row: {
          candidate_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_tiers: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          key: string
          max_ai_interviews: number | null
          max_jobs: number | null
          max_resumes: number | null
          name: string
          price_amount: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          key: string
          max_ai_interviews?: number | null
          max_jobs?: number | null
          max_resumes?: number | null
          name: string
          price_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          key?: string
          max_ai_interviews?: number | null
          max_jobs?: number | null
          max_resumes?: number | null
          name?: string
          price_amount?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          hr_email: string | null
          id: string
          last_active_at: string | null
          last_ip: string | null
          location: string | null
          signup_ip: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hr_email?: string | null
          id: string
          last_active_at?: string | null
          last_ip?: string | null
          location?: string | null
          signup_ip?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hr_email?: string | null
          id?: string
          last_active_at?: string | null
          last_ip?: string | null
          location?: string | null
          signup_ip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          endpoint_id: string
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint_id: string
          event: string
          id?: string
          payload: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_id?: string
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _sh_call_edge: {
        Args: { body: Json; fn_name: string }
        Returns: undefined
      }
      get_interview_session_by_token: {
        Args: { _token: string }
        Returns: {
          candidate_name: string
          company_name: string
          expires_at: string
          id: string
          job_description: string
          job_title: string
          required_skills: string[]
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "recruiter" | "member"
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
      app_role: ["super_admin", "admin", "recruiter", "member"],
    },
  },
} as const
