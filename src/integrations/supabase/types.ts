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
      blocos_perguntas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          pesquisa_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          pesquisa_id: string
          titulo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          pesquisa_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocos_perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_diarias: {
        Row: {
          concluidas: number
          created_at: string
          data: string
          entrevistador_id: string
          id: string
          meta: number
        }
        Insert: {
          concluidas?: number
          created_at?: string
          data?: string
          entrevistador_id: string
          id?: string
          meta?: number
        }
        Update: {
          concluidas?: number
          created_at?: string
          data?: string
          entrevistador_id?: string
          id?: string
          meta?: number
        }
        Relationships: []
      }
      perguntas: {
        Row: {
          bloco_id: string | null
          created_at: string
          id: string
          obrigatoria: boolean
          opcoes: string[] | null
          opcoes_sugeridas: string[] | null
          ordem: number
          pesquisa_id: string
          permite_outro: boolean
          texto: string
          tipo_pergunta: string
          tipo: string
        }
        Insert: {
          bloco_id?: string | null
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: string[] | null
          opcoes_sugeridas?: string[] | null
          ordem?: number
          pesquisa_id: string
          permite_outro?: boolean
          texto: string
          tipo_pergunta?: string
          tipo: string
        }
        Update: {
          bloco_id?: string | null
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: string[] | null
          opcoes_sugeridas?: string[] | null
          ordem?: number
          pesquisa_id?: string
          permite_outro?: boolean
          texto?: string
          tipo_pergunta?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "blocos_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas: {
        Row: {
          ativa: boolean
          codigo_liberacao: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          codigo_liberacao?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          codigo_liberacao?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      respostas: {
        Row: {
          audio_url: string | null
          client_id: string | null
          created_at: string
          entrevistador_id: string
          id: string
          latitude: number | null
          longitude: number | null
          pesquisa_id: string
          respostas: Json
          synced: boolean
        }
        Insert: {
          audio_url?: string | null
          client_id?: string | null
          created_at?: string
          entrevistador_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pesquisa_id: string
          respostas?: Json
          synced?: boolean
        }
        Update: {
          audio_url?: string | null
          client_id?: string | null
          created_at?: string
          entrevistador_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          pesquisa_id?: string
          respostas?: Json
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "respostas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_liberation_code: { Args: never; Returns: string }
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
    }
    Enums: {
      app_role: "admin" | "entrevistador"
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
      app_role: ["admin", "entrevistador"],
    },
  },
} as const
