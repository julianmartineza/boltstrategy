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
      programs: {
        Row: {
          id: string
          name: string
          description: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          status?: string
          created_at?: string
        }
      }
      activity_responses: {
        Row: {
          id: string
          content: Json
          created_at: string
          user_id: string
          stage_content_id: string
        }
        Insert: {
          id?: string
          content: Json
          created_at?: string
          user_id: string
          stage_content_id: string
        }
        Update: {
          id?: string
          content?: Json
          created_at?: string
          user_id?: string
          stage_content_id?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          industry: string
          size: string
          created_at: string
          annual_revenue: number
          website: string
        }
        Insert: {
          id?: string
          name: string
          industry: string
          size: string
          created_at?: string
          annual_revenue?: number
          website?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string
          size?: string
          created_at?: string
          annual_revenue?: number
          website?: string
        }
      }
      diagnostics: {
        Row: {
          id: string
          company_id: string
          diagnostic_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          diagnostic_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          diagnostic_data?: Json
          created_at?: string
        }
      }
      strategy_stages: {
        Row: {
          id: string
          name: string
          order_num: number
          required_content: string
          prompt_template: string
          program_id: string | null
        }
        Insert: {
          id?: string
          name: string
          order_num: number
          required_content: string
          prompt_template: string
          program_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          order_num?: number
          required_content?: string
          prompt_template?: string
          program_id?: string | null
        }
      }
      stage_content: {
        Row: {
          id: string
          stage_id: string
          content_type: 'video' | 'text' | 'activity'
          title: string
          content: string
          order_num: number
          created_at: string
          metadata: Json | null
          activity_data: {
            type: string
            description: string
            prompt_template: string
            required_steps?: string[]
            completion_criteria?: {
              min_responses?: number
              required_topics?: string[]
            }
          } | null
        }
        Insert: {
          id?: string
          stage_id: string
          content_type: 'video' | 'text' | 'activity'
          title: string
          content: string
          order_num?: number
          created_at?: string
          metadata?: Json | null
          activity_data?: Json | null
        }
        Update: {
          id?: string
          stage_id?: string
          content_type?: 'video' | 'text' | 'activity'
          title?: string
          content?: string
          order_num?: number
          created_at?: string
          metadata?: Json | null
          activity_data?: Json | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      viewed_contents: {
        Row: {
          id: string
          user_id: string
          content_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          viewed_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      set_user_admin: {
        Args: {
          user_id: string
          admin_status: boolean
        }
        Returns: undefined
      }
    }
  }
}