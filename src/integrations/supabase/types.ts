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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          phone: string | null
          recovered: boolean | null
          reminder_sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          phone?: string | null
          recovered?: boolean | null
          reminder_sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          phone?: string | null
          recovered?: boolean | null
          reminder_sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          apartment: string | null
          area: string | null
          building: string | null
          created_at: string
          full_name: string
          id: string
          is_default: boolean | null
          label: string | null
          notes: string | null
          phone: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          area?: string | null
          building?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          notes?: string | null
          phone?: string
          street?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          area?: string | null
          building?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          notes?: string | null
          phone?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_activity: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      agent_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          interaction_id: string | null
          rating: number | null
          reasons: string[]
          signal_type: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          rating?: number | null
          reasons?: string[]
          signal_type?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          rating?: number | null
          reasons?: string[]
          signal_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "agent_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_interactions: {
        Row: {
          actor_id: string | null
          actor_role: string
          agent_type: string
          created_at: string
          guardrail_triggered: boolean
          id: string
          implicit_signal: string | null
          input_summary: string | null
          model_used: string | null
          outcome: string
          thinking_summary: string | null
          thread_id: string | null
          tools_called: Json
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          agent_type: string
          created_at?: string
          guardrail_triggered?: boolean
          id?: string
          implicit_signal?: string | null
          input_summary?: string | null
          model_used?: string | null
          outcome?: string
          thinking_summary?: string | null
          thread_id?: string | null
          tools_called?: Json
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          agent_type?: string
          created_at?: string
          guardrail_triggered?: boolean
          id?: string
          implicit_signal?: string | null
          input_summary?: string | null
          model_used?: string | null
          outcome?: string
          thinking_summary?: string | null
          thread_id?: string | null
          tools_called?: Json
        }
        Relationships: []
      }
      ai_agent_configs: {
        Row: {
          agent_name: string
          dynamic_rules: Json
          forbidden_patterns: Json
          id: string
          strict_price_guard: boolean
          system_prompt_base: string
          temperature: number
          updated_at: string
        }
        Insert: {
          agent_name: string
          dynamic_rules?: Json
          forbidden_patterns?: Json
          id?: string
          strict_price_guard?: boolean
          system_prompt_base: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          agent_name?: string
          dynamic_rules?: Json
          forbidden_patterns?: Json
          id?: string
          strict_price_guard?: boolean
          system_prompt_base?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_alerts: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          provider: string | null
          resolved: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          provider?: string | null
          resolved?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          provider?: string | null
          resolved?: boolean
        }
        Relationships: []
      }
      ai_audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_type: string
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          proposal_id: string | null
          record_id: string | null
          table_affected: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_type: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          proposal_id?: string | null
          record_id?: string | null
          table_affected?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_type?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          proposal_id?: string | null
          record_id?: string | null
          table_affected?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_governance_audit_logs: {
        Row: {
          action_type: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          executed_by: string | null
          id: string
          proposal_id: string | null
        }
        Insert: {
          action_type: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          executed_by?: string | null
          id?: string
          proposal_id?: string | null
        }
        Update: {
          action_type?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          executed_by?: string | null
          id?: string
          proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_governance_audit_logs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "ai_governance_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_governance_proposals: {
        Row: {
          action_payload: Json
          action_type: string
          agent_name: string
          category: string
          confidence_score: number | null
          created_at: string
          dedupe_key: string | null
          distinct_sessions_count: number | null
          evidence_count: number
          execution_result: string | null
          expected_impact_ar: string
          id: string
          reflection: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          root_cause_ar: string
          sample_interaction_ids: string[]
          severity: string
          side_effects_evaluated: string | null
          status: string
          title_ar: string
          why_this_fix: string | null
        }
        Insert: {
          action_payload: Json
          action_type: string
          agent_name?: string
          category: string
          confidence_score?: number | null
          created_at?: string
          dedupe_key?: string | null
          distinct_sessions_count?: number | null
          evidence_count?: number
          execution_result?: string | null
          expected_impact_ar: string
          id?: string
          reflection?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause_ar: string
          sample_interaction_ids?: string[]
          severity?: string
          side_effects_evaluated?: string | null
          status?: string
          title_ar: string
          why_this_fix?: string | null
        }
        Update: {
          action_payload?: Json
          action_type?: string
          agent_name?: string
          category?: string
          confidence_score?: number | null
          created_at?: string
          dedupe_key?: string | null
          distinct_sessions_count?: number | null
          evidence_count?: number
          execution_result?: string | null
          expected_impact_ar?: string
          id?: string
          reflection?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          root_cause_ar?: string
          sample_interaction_ids?: string[]
          severity?: string
          side_effects_evaluated?: string | null
          status?: string
          title_ar?: string
          why_this_fix?: string | null
        }
        Relationships: []
      }
      ai_key_vault: {
        Row: {
          api_key: string
          base_url: string | null
          cooldown_until: string | null
          created_at: string
          id: string
          label: string | null
          last_error: string | null
          last_used_at: string | null
          model: string | null
          priority: number
          provider: string
          status: string
          total_requests: number
          updated_at: string
        }
        Insert: {
          api_key: string
          base_url?: string | null
          cooldown_until?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          model?: string | null
          priority?: number
          provider: string
          status?: string
          total_requests?: number
          updated_at?: string
        }
        Update: {
          api_key?: string
          base_url?: string | null
          cooldown_until?: string | null
          created_at?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_used_at?: string | null
          model?: string | null
          priority?: number
          provider?: string
          status?: string
          total_requests?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_proposals: {
        Row: {
          action_type: string
          agent_type: string
          created_at: string
          id: string
          payload: Json
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          risk_flag: string
          status: string
        }
        Insert: {
          action_type: string
          agent_type: string
          created_at?: string
          id?: string
          payload: Json
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          risk_flag?: string
          status?: string
        }
        Update: {
          action_type?: string
          agent_type?: string
          created_at?: string
          id?: string
          payload?: Json
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          risk_flag?: string
          status?: string
        }
        Relationships: []
      }
      ai_provider_settings: {
        Row: {
          api_key: string | null
          base_url: string | null
          id: number
          model: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          id?: number
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          id?: number
          model?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tool_registry: {
        Row: {
          agent_name: string
          description_ar: string
          id: string
          is_enabled: boolean
          label_ar: string
          requires_approval: boolean
          runtime_hints: string
          tool_name: string
          updated_at: string
        }
        Insert: {
          agent_name: string
          description_ar: string
          id?: string
          is_enabled?: boolean
          label_ar: string
          requires_approval?: boolean
          runtime_hints?: string
          tool_name: string
          updated_at?: string
        }
        Update: {
          agent_name?: string
          description_ar?: string
          id?: string
          is_enabled?: boolean
          label_ar?: string
          requires_approval?: boolean
          runtime_hints?: string
          tool_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          delivery_zones: string[]
          estimated_minutes: number | null
          fee: number | null
          governorate: string | null
          id: string
          is_active: boolean
          is_main: boolean
          lat: number | null
          lng: number | null
          min_order_amount: number | null
          name: string
          name_en: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_zones?: string[]
          estimated_minutes?: number | null
          fee?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          lat?: number | null
          lng?: number | null
          min_order_amount?: number | null
          name: string
          name_en?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          delivery_zones?: string[]
          estimated_minutes?: number | null
          fee?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_main?: boolean
          lat?: number | null
          lng?: number | null
          min_order_amount?: number | null
          name?: string
          name_en?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          name_ar: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_ar?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_ar?: string | null
          slug?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      delivery_slots: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          max_orders: number | null
          slot_label: string
          slot_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_orders?: number | null
          slot_label: string
          slot_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_orders?: number | null
          slot_label?: string
          slot_time?: string | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          area: string | null
          city: string | null
          country: string
          created_at: string
          estimated_minutes: number | null
          fee: number
          governorate: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          name: string
          sort_order: number
        }
        Insert: {
          area?: string | null
          city?: string | null
          country?: string
          created_at?: string
          estimated_minutes?: number | null
          fee?: number
          governorate?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          area?: string | null
          city?: string | null
          country?: string
          created_at?: string
          estimated_minutes?: number | null
          fee?: number
          governorate?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      flash_offers: {
        Row: {
          created_at: string
          discount_percentage: number
          ends_at: string
          id: string
          is_active: boolean | null
          product_ids: string[]
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          discount_percentage: number
          ends_at: string
          id?: string
          is_active?: boolean | null
          product_ids?: string[]
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          ends_at?: string
          id?: string
          is_active?: boolean | null
          product_ids?: string[]
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      nawat_threads: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          order_id?: string | null
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          coupon_code: string | null
          created_at: string | null
          customer_name: string | null
          delivery_fee: number | null
          delivery_method: string | null
          delivery_slot: string | null
          delivery_zone_id: string | null
          discount_amount: number | null
          id: string
          idempotency_key: string | null
          items: Json | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          phone: string | null
          ref_source: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number
          total_price: number | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_slot?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          phone?: string | null
          ref_source?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount: number
          total_price?: number | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_slot?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          items?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          phone?: string | null
          ref_source?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number
          total_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_reference: string | null
          id: string
          method: string
          order_id: string
          reconciled_at: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_reference?: string | null
          id?: string
          method: string
          order_id: string
          reconciled_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_reference?: string | null
          id?: string
          method?: string
          order_id?: string
          reconciled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          buy_quantity: number
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pay_quantity: number
          product_ids: string[]
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          buy_quantity?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pay_quantity?: number
          product_ids?: string[]
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          buy_quantity?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pay_quantity?: number
          product_ids?: string[]
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_search_synonyms: {
        Row: {
          created_at: string
          id: string
          mapped_terms: string[]
          product_ids: string[]
          source: string
          term: string
        }
        Insert: {
          created_at?: string
          id?: string
          mapped_terms: string[]
          product_ids?: string[]
          source?: string
          term: string
        }
        Update: {
          created_at?: string
          id?: string
          mapped_terms?: string[]
          product_ids?: string[]
          source?: string
          term?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          avg_rating: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          dietary_tags: string[]
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_ar: string | null
          old_price: number | null
          original_price: number | null
          price: number
          price_per_unit: number | null
          rating: number | null
          reviews_count: number | null
          search_keywords: string[]
          stock: number | null
          stock_quantity: number | null
          unit_label: string | null
        }
        Insert: {
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          dietary_tags?: string[]
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_ar?: string | null
          old_price?: number | null
          original_price?: number | null
          price: number
          price_per_unit?: number | null
          rating?: number | null
          reviews_count?: number | null
          search_keywords?: string[]
          stock?: number | null
          stock_quantity?: number | null
          unit_label?: string | null
        }
        Update: {
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          dietary_tags?: string[]
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_ar?: string | null
          old_price?: number | null
          original_price?: number | null
          price?: number
          price_per_unit?: number | null
          rating?: number | null
          reviews_count?: number | null
          search_keywords?: string[]
          stock?: number | null
          stock_quantity?: number | null
          unit_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          ai_preferences: Json
          city: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          ai_preferences?: Json
          city?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          ai_preferences?: Json
          city?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_engine_approvals: {
        Row: {
          actor_user_id: string
          applying_at: string | null
          approved_at: string
          change_set: Json
          change_set_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          source_id: string
          status: string
        }
        Insert: {
          actor_user_id: string
          applying_at?: string | null
          approved_at?: string
          change_set: Json
          change_set_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          source_id: string
          status?: string
        }
        Update: {
          actor_user_id?: string
          applying_at?: string | null
          approved_at?: string
          change_set?: Json
          change_set_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          source_id?: string
          status?: string
        }
        Relationships: []
      }
      project_engine_audit: {
        Row: {
          actor_user_id: string | null
          approval_id: string | null
          change_set_hash: string | null
          created_at: string
          event_type: string
          id: number
          metadata: Json | null
          provider_result: Json | null
          source_id: string | null
          validation_result: Json | null
        }
        Insert: {
          actor_user_id?: string | null
          approval_id?: string | null
          change_set_hash?: string | null
          created_at?: string
          event_type: string
          id?: never
          metadata?: Json | null
          provider_result?: Json | null
          source_id?: string | null
          validation_result?: Json | null
        }
        Update: {
          actor_user_id?: string | null
          approval_id?: string | null
          change_set_hash?: string | null
          created_at?: string
          event_type?: string
          id?: never
          metadata?: Json | null
          provider_result?: Json | null
          source_id?: string | null
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_engine_audit_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "project_engine_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_note: string | null
          id: string
          order_item_id: string
          reason_category: string
          resolution_type: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_note?: string | null
          id?: string
          order_item_id: string
          reason_category: string
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_note?: string | null
          id?: string
          order_item_id?: string
          reason_category?: string
          resolution_type?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          accent_color: string
          allow_signups: boolean
          announcement_bg_color: string
          announcement_enabled: boolean
          announcement_text: string
          background_color: string
          bank_account_info: string | null
          cart_empty_bg: string | null
          created_at: string
          default_delivery_fee: number
          favicon_url: string | null
          first_order_coupon_code: string | null
          first_order_coupon_enabled: boolean
          first_order_discount_percent: number
          floating_element_image: string | null
          font_family: string
          foreground_color: string
          free_shipping_threshold: number
          ga4_id: string | null
          hero_bg_image: string | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          instapay_handle: string | null
          login_bg_pattern: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          min_order_amount: number
          primary_color: string
          site_name: string
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string
          allow_signups?: boolean
          announcement_bg_color?: string
          announcement_enabled?: boolean
          announcement_text?: string
          background_color?: string
          bank_account_info?: string | null
          cart_empty_bg?: string | null
          created_at?: string
          default_delivery_fee?: number
          favicon_url?: string | null
          first_order_coupon_code?: string | null
          first_order_coupon_enabled?: boolean
          first_order_discount_percent?: number
          floating_element_image?: string | null
          font_family?: string
          foreground_color?: string
          free_shipping_threshold?: number
          ga4_id?: string | null
          hero_bg_image?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instapay_handle?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number
          primary_color?: string
          site_name?: string
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string
          allow_signups?: boolean
          announcement_bg_color?: string
          announcement_enabled?: boolean
          announcement_text?: string
          background_color?: string
          bank_account_info?: string | null
          cart_empty_bg?: string | null
          created_at?: string
          default_delivery_fee?: number
          favicon_url?: string | null
          first_order_coupon_code?: string | null
          first_order_coupon_enabled?: boolean
          first_order_discount_percent?: number
          floating_element_image?: string | null
          font_family?: string
          foreground_color?: string
          free_shipping_threshold?: number
          ga4_id?: string | null
          hero_bg_image?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          instapay_handle?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number
          primary_color?: string
          site_name?: string
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      store_settings_history: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          snapshot: Json
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          snapshot: Json
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      store_settings_public: {
        Row: {
          accent_color: string | null
          announcement_bg_color: string | null
          announcement_enabled: boolean | null
          announcement_text: string | null
          background_color: string | null
          cart_empty_bg: string | null
          created_at: string | null
          default_delivery_fee: number | null
          favicon_url: string | null
          first_order_coupon_code: string | null
          first_order_coupon_enabled: boolean | null
          first_order_discount_percent: number | null
          floating_element_image: string | null
          font_family: string | null
          foreground_color: string | null
          free_shipping_threshold: number | null
          ga4_id: string | null
          hero_bg_image: string | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string | null
          login_bg_pattern: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          min_order_amount: number | null
          primary_color: string | null
          site_name: string | null
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          background_color?: string | null
          cart_empty_bg?: string | null
          created_at?: string | null
          default_delivery_fee?: number | null
          favicon_url?: string | null
          first_order_coupon_code?: string | null
          first_order_coupon_enabled?: boolean | null
          first_order_discount_percent?: number | null
          floating_element_image?: string | null
          font_family?: string | null
          foreground_color?: string | null
          free_shipping_threshold?: number | null
          ga4_id?: string | null
          hero_bg_image?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number | null
          primary_color?: string | null
          site_name?: string | null
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          background_color?: string | null
          cart_empty_bg?: string | null
          created_at?: string | null
          default_delivery_fee?: number | null
          favicon_url?: string | null
          first_order_coupon_code?: string | null
          first_order_coupon_enabled?: boolean | null
          first_order_discount_percent?: number | null
          floating_element_image?: string | null
          font_family?: string | null
          foreground_color?: string | null
          free_shipping_threshold?: number | null
          ga4_id?: string | null
          hero_bg_image?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number | null
          primary_color?: string | null
          site_name?: string | null
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_order:
        | {
            Args: {
              p_address: string
              p_coupon_code: string
              p_customer_name: string
              p_delivery_method: string
              p_delivery_zone_id: string
              p_items: Json
              p_notes: string
              p_payment_method: string
              p_payment_reference: string
              p_phone: string
              p_ref_source: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address: string
              p_coupon_code: string
              p_customer_name: string
              p_delivery_method: string
              p_delivery_zone_id: string
              p_idempotency_key?: string
              p_items: Json
              p_notes: string
              p_payment_method: string
              p_payment_reference: string
              p_phone: string
              p_ref_source: string
            }
            Returns: string
          }
      get_my_role: { Args: never; Returns: string }
      get_payment_config: {
        Args: never
        Returns: {
          bank_account_info: string
          instapay_handle: string
          store_address: string
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_ai_agent: { Args: never; Returns: boolean }
      propose_ai_action: {
        Args: { p_action_type: string; p_agent_type: string; p_payload: Json }
        Returns: string
      }
      record_agent_signal: {
        Args: {
          p_guardrail_triggered?: boolean
          p_interaction_id: string
          p_signal: string
          p_thinking_summary?: string
        }
        Returns: undefined
      }
      review_ai_proposal: {
        Args: {
          p_decision: string
          p_proposal_id: string
          p_reviewer_note?: string
        }
        Returns: undefined
      }
      search_products_hybrid: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          image_url: string
          matched_by: string
          name: string
          name_ar: string
          price_per_unit: number
          product_id: string
          score: number
          stock_quantity: number
          unit_label: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          code: string
          discount_type: string
          discount_value: number
        }[]
      }
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
    Enums: {},
  },
} as const
