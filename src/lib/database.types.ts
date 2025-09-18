
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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comment_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          assigned_agent_id: string | null
          client_id: string
          created_at: string
          id: string
          linked_ticket_id: string | null
          status: string
          updated_at: string
          client_name: string | null
          client_email: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          linked_ticket_id?: string | null
          status?: string
          updated_at?: string
          client_name?: string | null
          client_email?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          linked_ticket_id?: string | null
          status?: string
          updated_at?: string
          client_name?: string | null
          client_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_linked_ticket_id_fkey"
            columns: ["linked_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_views: {
        Row: {
          comment_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          comment_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          comment_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_views_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "ticket_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          crm_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          crm_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          crm_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string | null
          content: string | null
          embedding: any | null // pgvector type
          created_at: string
        }
        Insert: {
          id?: string
          document_id?: string | null
          content?: string | null
          embedding?: any | null // pgvector type
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string | null
          content?: string | null
          embedding?: any | null // pgvector type
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_documents"
            referencedColumns: ["id"]
          }
        ]
      }
      internal_ticket_collaborators: {
        Row: {
          internal_ticket_id: string
          user_id: string
        }
        Insert: {
          internal_ticket_id: string
          user_id: string
        }
        Update: {
          internal_ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_ticket_collaborators_internal_ticket_id_fkey"
            columns: ["internal_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_ticket_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_ticket_departments: {
        Row: {
          department_id: string
          internal_ticket_id: string
        }
        Insert: {
          department_id: string
          internal_ticket_id: string
        }
        Update: {
          department_id?: string
          internal_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_ticket_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_ticket_departments_internal_ticket_id_fkey"
            columns: ["internal_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_tickets: {
        Row: {
          assigned_to: string | null
          attachment_url: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          is_external: boolean
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          sla_policy_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          is_external?: boolean
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          sla_policy_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_external?: boolean
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          sla_policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_tickets_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          id: string
          name: string
          description: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          department_id: string | null
          response_time_minutes: number
          resolution_time_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          department_id?: string | null
          response_time_minutes: number
          resolution_time_minutes: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          department_id?: string | null
          response_time_minutes?: number
          resolution_time_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      knowledge_base_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          file_name: string
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string | null
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string | null
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string | null
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prefilled_questions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          question: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "prefilled_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          crm_manager_id: number | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string | null
          website: string | null
          deleted_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          crm_manager_id?: number | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          deleted_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          crm_manager_id?: number | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      role_permissions: {
        Row: {
          id: number
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          permission: Database["public"]["Enums"]["permission_key"]
          department_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          permission: Database["public"]["Enums"]["permission_key"]
          department_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          permission?: Database["public"]["Enums"]["permission_key"]
          department_id?: string | null
        }
        Relationships: [
           {
            foreignKeyName: "role_permissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          }
        ]
      }
      task_columns: {
        Row: {
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          column_id: string
          content: string | null
          created_at: string
          id: string
          internal_ticket_id: string | null
          position: number
        }
        Insert: {
          column_id: string
          content?: string | null
          created_at?: string
          id?: string
          internal_ticket_id?: string | null
          position: number
        }
        Update: {
          column_id?: string
          content?: string | null
          created_at?: string
          id?: string
          internal_ticket_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "task_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_internal_ticket_id_fkey"
            columns: ["internal_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          crm_ticket_id: string | null
          id: string
          internal_ticket_id: string | null
          is_reply: boolean | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          crm_ticket_id?: string | null
          id?: string
          internal_ticket_id?: string | null
          is_reply?: boolean | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          crm_ticket_id?: string | null
          id?: string
          internal_ticket_id?: string | null
          is_reply?: boolean | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_crm_ticket_id_fkey"
            columns: ["crm_ticket_id"]
            isOneToOne: false
            referencedRelation: "crm_tickets"
            referencedColumns: ["crm_id"]
          },
          {
            foreignKeyName: "ticket_comments_internal_ticket_id_fkey"
            columns: ["internal_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ticket_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: number
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: number
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: number
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_links: {
        Row: {
          created_at: string
          crm_ticket_id: string
          id: number
          internal_ticket_id: string
        }
        Insert: {
          created_at?: string
          crm_ticket_id: string
          id?: number
          internal_ticket_id: string
        }
        Update: {
          created_at?: string
          crm_ticket_id?: string
          id?: number
          internal_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_links_crm_ticket_id_fkey"
            columns: ["crm_ticket_id"]
            isOneToOne: false
            referencedRelation: "crm_tickets"
            referencedColumns: ["crm_id"]
          },
          {
            foreignKeyName: "ticket_links_internal_ticket_id_fkey"
            columns: ["internal_ticket_id"]
            isOneToOne: false
            referencedRelation: "internal_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          category: string | null
          department_id: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          title: string
        }
        Insert: {
          category?: string | null
          department_id: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          title: string
        }
        Update: {
          category?: string | null
          department_id?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_performance_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
            agent_id: string,
            agent_name: string,
            agent_avatar_url: string,
            total_resolved: number,
            avg_resolution_time_minutes: number
        }[]
      }
      get_agent_sla_success_rate: {
        Args: Record<PropertyKey, never>
        Returns: {
            agent_id: string,
            sla_success_rate: number
        }[]
      }
      get_least_busy_department_head: {
        Args: { dept_id: string }
        Returns: string
      }
      get_user_department_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: string
      }
      match_document_chunks: {
        Args: {
          query_embedding: any // pgvector type
          match_count: number
          min_similarity: number
        }
        Returns: {
          id: string
          content: string
          similarity: number
        }[]
      }
      seed_task_columns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_chat_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      escalate_chat_to_agent: {
        Args: { p_chat_id: string, p_client_name: string, p_client_email: string }
        Returns: number
      }
    }
    Enums: {
      permission_key: 
        | "view_analytics" 
        | "access_knowledge_base" 
        | "create_tickets" 
        | "view_all_tickets_in_department" 
        | "change_ticket_status" 
        | "delete_tickets" 
        | "edit_ticket_properties" 
        | "assign_tickets" 
        | "manage_all_users" 
        | "manage_users_in_department" 
        | "access_admin_panel" 
        | "manage_departments" 
        | "manage_templates" 
        | "manage_knowledge_base" 
        | "manage_sla_policies" 
        | "manage_chat_settings" 
        | "manage_roles"
        | "access_crm_tickets"
        | "access_live_chat"
        | "view_task_board"
        | "delete_users"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role:
        | "system_admin"
        | "super_admin"
        | "admin"
        | "ceo"
        | "department_head"
        | "agent"
        | "user"
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

export type Notification = Database["public"]["Tables"]["notifications"]["Row"] & {
    profiles: Pick<Profile, 'full_name' | 'avatar_url' | 'username'> | null;
}
export type Department = Database["public"]["Tables"]["departments"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type RolePermissions = Database["public"]["Tables"]["role_permissions"]["Row"]
export type InternalTicketDepartment =
  Database["public"]["Tables"]["internal_ticket_departments"]["Row"]
export type InternalTicketCollaborator =
  Database["public"]["Tables"]["internal_ticket_collaborators"]["Row"]
export type CommentTemplate = Database["public"]["Tables"]["comment_templates"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];

// Define all possible permissions available in the system, grouped by category.
export const permissionGroups = {
  general: {
    title: 'General Access',
    permissions: {
      view_analytics: {
        label: 'View Analytics Page',
        description: 'User can access the main analytics and reporting dashboard.'
      },
      access_knowledge_base: {
        label: 'Access Knowledge Base',
        description: 'User can view articles in the internal knowledge base.'
      },
      create_tickets: {
        label: 'Create Tickets',
        description: 'Allows the user to create new internal support tickets.'
      },
      access_crm_tickets: {
        label: 'Access CRM Desk',
        description: 'Allows user to view and interact with client-facing tickets.'
      },
       access_live_chat: {
        label: 'Access Live Chat',
        description: 'Allows user to view and handle incoming live chats from clients.'
      },
       view_task_board: {
        label: 'View Task Board',
        description: 'Allows user to view and manage tasks on the Kanban board.'
      }
    },
  },
  ticket_management: {
    title: 'Ticket Management',
    permissions: {
      view_all_tickets_in_department: {
        label: 'View All Tickets in Own Department',
        description: 'Allows viewing of all tickets assigned to their department, not just their own.'
      },
      change_ticket_status: {
        label: 'Change Ticket Progress Status',
        description: 'Allows the user to change the status of any ticket they can view. Ticket creators can always change the status of their own tickets.'
      },
      delete_tickets: {
        label: 'Delete Tickets',
        description: 'Allows permanent deletion of tickets. (Use with caution)'
      },
      edit_ticket_properties: {
        label: 'Edit Ticket Details',
        description: 'User can edit properties like Priority, Category, etc.'
      },
      assign_tickets: {
        label: 'Assign Tickets to Users/Departments',
        description: 'Allows re-assigning tickets to other users or departments.'
      },
    },
  },
  user_management: {
    title: 'User Management',
    permissions: {
       manage_all_users: {
        label: 'Manage All Users',
        description: 'Grants access to the user management page to edit any user.'
      },
      manage_users_in_department: {
        label: 'Manage Users in Own Department',
        description: 'User can edit roles and details for other users within the same department.'
      },
      delete_users: {
        label: 'Delete Users',
        description: 'Allows permanent deletion of users from the system.'
      },
    }
  },
  system_administration: {
    title: 'System Administration',
    permissions: {
        access_admin_panel: {
            label: 'Access Admin Panel',
            description: 'Grants access to the main system administration panel.'
        },
        manage_departments: {
          label: 'Manage Departments',
          description: 'Allows creating, editing, and deleting departments within the Admin Panel.'
        },
        manage_templates: {
          label: 'Manage Ticket Templates',
          description: 'Allows creating and editing quick-start ticket templates within the Admin Panel.'
        },
        manage_knowledge_base: {
          label: 'Manage Knowledge Base',
          description: 'Allows uploading and deleting documents for the AI Assistant.'
        },
        manage_sla_policies: {
          label: 'Manage SLA Policies',
          description: 'Allows configuration of Service Level Agreement rules within the Admin Panel.'
        },
        manage_chat_settings: {
          label: 'Manage Chat Settings',
          description: 'Allows managing settings for the AI chat widget, like prefilled questions.'
        },
        manage_roles: {
            label: 'Manage Roles & Permissions',
            description: 'Grants access to this permissions page to modify what roles can do.'
        }
    }
  }
};

export const allPermissionKeys = Object.values(permissionGroups).flatMap(group => Object.keys(group.permissions));
export type PermissionKey = keyof typeof permissionGroups.general.permissions | keyof typeof permissionGroups.ticket_management.permissions | keyof typeof permissionGroups.user_management.permissions | keyof typeof permissionGroups.system_administration.permissions;


export const allUserRoles: UserRole[] = ["system_admin", "super_admin", "admin", "ceo", "department_head", "agent", "user"];

// Defines which roles can be managed in the UI.
export const manageableRoles: UserRole[] = ["admin", "department_head", "agent", "user"];


export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: [
        "system_admin",
        "super_admin",
        "admin",
        "ceo",
        "department_head",
        "agent",
        "user",
      ],
    },
  },
} as const

    

  

    

    

    