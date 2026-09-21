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
      competitor_guidelines: {
        Row: {
          chave: string
          conteudo: string
          created_at: string
          id: string
          ordem: number
          titulo: string
        }
        Insert: {
          chave: string
          conteudo: string
          created_at?: string
          id?: string
          ordem?: number
          titulo: string
        }
        Update: {
          chave?: string
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number
          titulo?: string
        }
        Relationships: []
      }
      competitor_intel: {
        Row: {
          ameaca: string | null
          created_at: string
          forcas: string | null
          id: string
          nome: string
          ordem: number
          pergunta_descoberta: string | null
          prioridade: string | null
          reputacao: string | null
          taxa_modelo: string | null
          tipo: string | null
          updated_at: string
          vulnerabilidades: string | null
        }
        Insert: {
          ameaca?: string | null
          created_at?: string
          forcas?: string | null
          id?: string
          nome: string
          ordem?: number
          pergunta_descoberta?: string | null
          prioridade?: string | null
          reputacao?: string | null
          taxa_modelo?: string | null
          tipo?: string | null
          updated_at?: string
          vulnerabilidades?: string | null
        }
        Update: {
          ameaca?: string | null
          created_at?: string
          forcas?: string | null
          id?: string
          nome?: string
          ordem?: number
          pergunta_descoberta?: string | null
          prioridade?: string | null
          reputacao?: string | null
          taxa_modelo?: string | null
          tipo?: string | null
          updated_at?: string
          vulnerabilidades?: string | null
        }
        Relationships: []
      }
      competitor_playbook: {
        Row: {
          acao_seguinte: string | null
          created_at: string
          dados_minimos: string | null
          etapa: string
          evidencia: string | null
          falha: string | null
          id: string
          ordem: number
          pergunta_central: string | null
          saida: string | null
        }
        Insert: {
          acao_seguinte?: string | null
          created_at?: string
          dados_minimos?: string | null
          etapa: string
          evidencia?: string | null
          falha?: string | null
          id?: string
          ordem?: number
          pergunta_central?: string | null
          saida?: string | null
        }
        Update: {
          acao_seguinte?: string | null
          created_at?: string
          dados_minimos?: string | null
          etapa?: string
          evidencia?: string | null
          falha?: string | null
          id?: string
          ordem?: number
          pergunta_central?: string | null
          saida?: string | null
        }
        Relationships: []
      }
      competitor_sources: {
        Row: {
          created_at: string
          data_consulta: string | null
          fonte: string
          id: string
          sustenta: string | null
          tipo: string | null
          tratamento: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          data_consulta?: string | null
          fonte: string
          id?: string
          sustenta?: string | null
          tipo?: string | null
          tratamento?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          data_consulta?: string | null
          fonte?: string
          id?: string
          sustenta?: string | null
          tipo?: string | null
          tratamento?: string | null
          url?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          sdr_key: string | null
          sdr_only: boolean
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          sdr_key?: string | null
          sdr_only?: boolean
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          sdr_key?: string | null
          sdr_only?: boolean
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sdr_assignments: {
        Row: {
          created_at: string
          sdr_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sdr_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          sdr_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sdr_lead_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_leads: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          data_evento: string | null
          disqualified_at: string | null
          disqualified_by: string | null
          disqualified_reason: string | null
          evento_detectado: string | null
          fit_bio: string | null
          frequencia: string | null
          icp_status: string
          id: string
          is_backlog: boolean
          link_bio: string | null
          nome_empresa: string | null
          observacoes: string | null
          origem: string
          plataforma_atual: string | null
          post_preview: string | null
          raw: Json
          rd_integrated_at: string | null
          rd_manual: boolean
          rd_manual_at: string | null
          rd_manual_by: string | null
          rd_result: Json | null
          sdr_key: string
          segmento: string | null
          seguidores: string | null
          synced_at: string
          ticketeira_atual: string | null
          updated_at: string
          username: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string | null
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          evento_detectado?: string | null
          fit_bio?: string | null
          frequencia?: string | null
          icp_status?: string
          id?: string
          is_backlog?: boolean
          link_bio?: string | null
          nome_empresa?: string | null
          observacoes?: string | null
          origem?: string
          plataforma_atual?: string | null
          post_preview?: string | null
          raw?: Json
          rd_integrated_at?: string | null
          rd_manual?: boolean
          rd_manual_at?: string | null
          rd_manual_by?: string | null
          rd_result?: Json | null
          sdr_key: string
          segmento?: string | null
          seguidores?: string | null
          synced_at?: string
          ticketeira_atual?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_evento?: string | null
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          evento_detectado?: string | null
          fit_bio?: string | null
          frequencia?: string | null
          icp_status?: string
          id?: string
          is_backlog?: boolean
          link_bio?: string | null
          nome_empresa?: string | null
          observacoes?: string | null
          origem?: string
          plataforma_atual?: string | null
          post_preview?: string | null
          raw?: Json
          rd_integrated_at?: string | null
          rd_manual?: boolean
          rd_manual_at?: string | null
          rd_manual_by?: string | null
          rd_result?: Json | null
          sdr_key?: string
          segmento?: string | null
          seguidores?: string | null
          synced_at?: string
          ticketeira_atual?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_panel_permissions: {
        Row: {
          can_download: boolean
          can_upload: boolean
          can_view: boolean
          created_at: string
          id: string
          panel_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_download?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          panel_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_download?: boolean
          can_upload?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          panel_key?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_sdr_key: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
