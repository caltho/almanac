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
      activities: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          order_index: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          log_date: string
          notes: string | null
          owner_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          log_date: string
          notes?: string | null
          owner_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquired_on: string | null
          archived_at: string | null
          created_at: string
          currency: string
          custom: Json
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          location: string | null
          name: string
          notes: string | null
          owner_id: string
          photo_url: string | null
          tags: string[]
          updated_at: string
          value: number | null
        }
        Insert: {
          acquired_on?: string | null
          archived_at?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          location?: string | null
          name: string
          notes?: string | null
          owner_id: string
          photo_url?: string | null
          tags?: string[]
          updated_at?: string
          value?: number | null
        }
        Update: {
          acquired_on?: string | null
          archived_at?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          location?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          photo_url?: string | null
          tags?: string[]
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency: string
          id: string
          owner_id: string
          period: Database["public"]["Enums"]["budget_period"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency?: string
          id?: string
          owner_id: string
          period?: Database["public"]["Enums"]["budget_period"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          id?: string
          owner_id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          rules: Json
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          rules?: Json
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_attribute_defs: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          order_index: number
          owner_id: string
          required: boolean
          table_name: string
          type: Database["public"]["Enums"]["custom_attr_type"]
          ui_hints: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          order_index?: number
          owner_id: string
          required?: boolean
          table_name: string
          type: Database["public"]["Enums"]["custom_attr_type"]
          ui_hints?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          order_index?: number
          owner_id?: string
          required?: boolean
          table_name?: string
          type?: Database["public"]["Enums"]["custom_attr_type"]
          ui_hints?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dataset_rows: {
        Row: {
          created_at: string
          data: Json
          dataset_id: string
          id: string
          name: string
          order_index: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          dataset_id: string
          id?: string
          name?: string
          order_index?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          dataset_id?: string
          id?: string
          name?: string
          order_index?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          columns: Json
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      habit_checks: {
        Row: {
          check_date: string
          created_at: string
          habit_id: string
          id: string
          owner_id: string
        }
        Insert: {
          check_date?: string
          created_at?: string
          habit_id: string
          id?: string
          owner_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          cadence: string
          created_at: string
          custom: Json
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          cadence?: string
          created_at?: string
          custom?: Json
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          cadence?: string
          created_at?: string
          custom?: Json
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          confirmed_at: string | null
          confirmed_rows: number
          created_at: string
          duplicate_rows: number
          filename: string | null
          id: string
          owner_id: string
          source: string | null
          status: Database["public"]["Enums"]["import_batch_status"]
          total_rows: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_rows?: number
          created_at?: string
          duplicate_rows?: number
          filename?: string | null
          id?: string
          owner_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_rows?: number
          created_at?: string
          duplicate_rows?: number
          filename?: string | null
          id?: string
          owner_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["import_batch_status"]
          total_rows?: number
        }
        Relationships: []
      }
      import_staging_rows: {
        Row: {
          amount: number | null
          batch_id: string
          confirmed_category_id: string | null
          created_at: string
          description: string | null
          id: string
          include: boolean
          is_duplicate: boolean
          owner_id: string
          posted_at: string | null
          proposed_category_id: string | null
          proposed_source: string | null
          raw: Json
          row_index: number
        }
        Insert: {
          amount?: number | null
          batch_id: string
          confirmed_category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          include?: boolean
          is_duplicate?: boolean
          owner_id: string
          posted_at?: string | null
          proposed_category_id?: string | null
          proposed_source?: string | null
          raw?: Json
          row_index: number
        }
        Update: {
          amount?: number | null
          batch_id?: string
          confirmed_category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          include?: boolean
          is_duplicate?: boolean
          owner_id?: string
          posted_at?: string | null
          proposed_category_id?: string | null
          proposed_source?: string | null
          raw?: Json
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_staging_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_staging_rows_confirmed_category_id_fkey"
            columns: ["confirmed_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_staging_rows_proposed_category_id_fkey"
            columns: ["proposed_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string | null
          created_at: string
          custom: Json
          deleted_at: string | null
          entry_date: string
          id: string
          mood: number | null
          owner_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          entry_date?: string
          id?: string
          mood?: number | null
          owner_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          entry_date?: string
          id?: string
          mood?: number | null
          owner_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      net_worth_snapshots: {
        Row: {
          breakdown: Json
          created_at: string
          currency: string
          id: string
          note: string | null
          owner_id: string
          snapshot_date: string
          total_value: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          owner_id: string
          snapshot_date?: string
          total_value: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          owner_id?: string
          snapshot_date?: string
          total_value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_items: {
        Row: {
          created_at: string
          custom: Json
          done_at: string | null
          id: string
          notes: string | null
          order_index: number
          owner_id: string
          parent_item_id: string | null
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom?: Json
          done_at?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          owner_id: string
          parent_item_id?: string | null
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom?: Json
          done_at?: string | null
          id?: string
          notes?: string | null
          order_index?: number
          owner_id?: string
          parent_item_id?: string | null
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          custom: Json
          description: string | null
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          custom?: Json
          description?: string | null
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          custom?: Json
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          grantee_id: string
          id: string
          owner_id: string
          perms: Database["public"]["Enums"]["share_perm"][]
          resource_id: string | null
          resource_type: string
          scope: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          grantee_id: string
          id?: string
          owner_id: string
          perms?: Database["public"]["Enums"]["share_perm"][]
          resource_id?: string | null
          resource_type: string
          scope?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          grantee_id?: string
          id?: string
          owner_id?: string
          perms?: Database["public"]["Enums"]["share_perm"][]
          resource_id?: string | null
          resource_type?: string
          scope?: Json
          updated_at?: string
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          archived_at: string | null
          created_at: string
          custom: Json
          id: string
          last_purchased_at: string | null
          name: string
          notes: string | null
          owner_id: string
          restock_period: Database["public"]["Enums"]["shopping_period"]
          status: Database["public"]["Enums"]["shopping_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          custom?: Json
          id?: string
          last_purchased_at?: string | null
          name: string
          notes?: string | null
          owner_id: string
          restock_period?: Database["public"]["Enums"]["shopping_period"]
          status?: Database["public"]["Enums"]["shopping_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          custom?: Json
          id?: string
          last_purchased_at?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          restock_period?: Database["public"]["Enums"]["shopping_period"]
          status?: Database["public"]["Enums"]["shopping_status"]
          updated_at?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          custom: Json
          deleted_at: string | null
          hours_slept: number | null
          id: string
          log_date: string
          notes: string | null
          owner_id: string
          quality: number | null
          updated_at: string
          went_to_bed: string | null
          woke_up: string | null
        }
        Insert: {
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          hours_slept?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          owner_id: string
          quality?: number | null
          updated_at?: string
          went_to_bed?: string | null
          woke_up?: string | null
        }
        Update: {
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          hours_slept?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          owner_id?: string
          quality?: number | null
          updated_at?: string
          went_to_bed?: string | null
          woke_up?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          custom: Json
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string
          priority: number | null
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id: string
          priority?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom?: Json
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string
          priority?: number | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          custom: Json
          deleted_at: string | null
          description: string
          description_hash: string | null
          id: string
          owner_id: string
          posted_at: string
          raw: Json
          source: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          deleted_at?: string | null
          description: string
          description_hash?: string | null
          id?: string
          owner_id: string
          posted_at: string
          raw?: Json
          source?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          deleted_at?: string | null
          description?: string
          description_hash?: string | null
          id?: string
          owner_id?: string
          posted_at?: string
          raw?: Json
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access: {
        Args: {
          p_extra?: Json
          p_perm?: Database["public"]["Enums"]["share_perm"]
          p_resource_id: string
          p_resource_type: string
        }
        Returns: boolean
      }
      find_user_by_email: { Args: { p_email: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      suggest_category_by_similarity: {
        Args: { p_description: string; p_min?: number }
        Returns: string
      }
    }
    Enums: {
      asset_kind:
        | "cash"
        | "investment"
        | "property"
        | "vehicle"
        | "possession"
        | "other"
      budget_period: "weekly" | "monthly" | "yearly"
      custom_attr_type:
        | "text"
        | "longtext"
        | "number"
        | "boolean"
        | "date"
        | "datetime"
        | "select"
        | "multiselect"
        | "url"
        | "rating"
      import_batch_status: "staged" | "confirmed" | "cancelled"
      share_perm: "read" | "comment" | "write"
      shopping_period: "weekly" | "monthly" | "quarterly" | "yearly" | "none"
      shopping_status: "buy" | "stocked"
      task_status: "todo" | "doing" | "done" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_kind: [
        "cash",
        "investment",
        "property",
        "vehicle",
        "possession",
        "other",
      ],
      budget_period: ["weekly", "monthly", "yearly"],
      custom_attr_type: [
        "text",
        "longtext",
        "number",
        "boolean",
        "date",
        "datetime",
        "select",
        "multiselect",
        "url",
        "rating",
      ],
      import_batch_status: ["staged", "confirmed", "cancelled"],
      share_perm: ["read", "comment", "write"],
      shopping_period: ["weekly", "monthly", "quarterly", "yearly", "none"],
      shopping_status: ["buy", "stocked"],
      task_status: ["todo", "doing", "done", "cancelled"],
    },
  },
} as const
