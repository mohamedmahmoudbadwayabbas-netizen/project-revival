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
          cart_data: Json
          created_at: string
          id: string
          phone: string | null
          recovered: boolean | null
          reminded_at: string | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_data: Json
          created_at?: string
          id?: string
          phone?: string | null
          recovered?: boolean | null
          reminded_at?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_data?: Json
          created_at?: string
          id?: string
          phone?: string | null
          recovered?: boolean | null
          reminded_at?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
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
          full_name: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          notes?: string | null
          phone: string
          street: string
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
          signal_type: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          rating?: number | null
          signal_type?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          rating?: number | null
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
          id: string
          input_summary: string | null
          model_used: string | null
          outcome: string
          thread_id: string | null
          tools_called: Json
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          agent_type: string
          created_at?: string
          id?: string
          input_summary?: string | null
          model_used?: string | null
          outcome?: string
          thread_id?: string | null
          tools_called?: Json
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          agent_type?: string
          created_at?: string
          id?: string
          input_summary?: string | null
          model_used?: string | null
          outcome?: string
          thread_id?: string | null
          tools_called?: Json
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
      ai_proposals: {
        Row: {
          agent_type: string
          created_at: string
          id: string
          raw_operation: Json
          reviewed_at: string | null
          reviewed_by: string | null
          risk_tier: string
          root_cause: string | null
          source_interaction_ids: string[]
          status: string
          title: string
        }
        Insert: {
          agent_type?: string
          created_at?: string
          id?: string
          raw_operation?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_tier?: string
          root_cause?: string | null
          source_interaction_ids?: string[]
          status?: string
          title: string
        }
        Update: {
          agent_type?: string
          created_at?: string
          id?: string
          raw_operation?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_tier?: string
          root_cause?: string | null
          source_interaction_ids?: string[]
          status?: string
          title?: string
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
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
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
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          name_ar: string | null
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_ar?: string | null
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          slug?: string
          sort_order?: number
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
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          id?: string
          order_id?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          phone?: string | null
          user_id?: string | null
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
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          first_order_only: boolean | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          first_order_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      delivery_slots: {
        Row: {
          created_at: string
          end_hour: number
          id: string
          is_active: boolean | null
          label: string
          sort_order: number | null
          start_hour: number
        }
        Insert: {
          created_at?: string
          end_hour: number
          id?: string
          is_active?: boolean | null
          label: string
          sort_order?: number | null
          start_hour: number
        }
        Update: {
          created_at?: string
          end_hour?: number
          id?: string
          is_active?: boolean | null
          label?: string
          sort_order?: number | null
          start_hour?: number
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
          is_active: boolean | null
          min_order_amount: number | null
          name: string
          sort_order: number | null
          updated_at: string
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
          is_active?: boolean | null
          min_order_amount?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string
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
          is_active?: boolean | null
          min_order_amount?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      flash_offers: {
        Row: {
          banner_image_url: string | null
          created_at: string
          discount_percent: number
          ends_at: string
          id: string
          is_active: boolean | null
          product_id: string | null
          starts_at: string
          title: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          discount_percent?: number
          ends_at: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          starts_at?: string
          title: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string
          cta_text: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
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
          address: string
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_name: string
          delivery_date: string | null
          delivery_fee: number
          delivery_method: string
          delivery_slot: string | null
          delivery_zone_id: string | null
          discount_amount: number | null
          id: string
          idempotency_key: string | null
          items: Json
          notes: string | null
          payment_method: string
          payment_reference: string | null
          phone: string
          ref_source: string | null
          shipping_address: Json | null
          status: string
          total_amount: number | null
          total_price: number
          tracking_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_method?: string
          delivery_slot?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          items?: Json
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          phone: string
          ref_source?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount?: number | null
          total_price: number
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_name?: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_method?: string
          delivery_slot?: string | null
          delivery_zone_id?: string | null
          discount_amount?: number | null
          id?: string
          idempotency_key?: string | null
          items?: Json
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          phone?: string
          ref_source?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount?: number | null
          total_price?: number
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
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
      products: {
        Row: {
          avg_rating: number
          badges: string[] | null
          category_id: string | null
          cooking_tip: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          is_by_weight: boolean
          is_featured: boolean
          is_on_sale: boolean
          is_popular: boolean
          is_top_seller: boolean
          low_stock_threshold: number
          name: string
          name_ar: string | null
          old_price: number | null
          original_price: number | null
          price: number | null
          price_per_unit: number
          purchase_count: number
          rating: number | null
          reviews_count: number
          stock: number | null
          stock_quantity: number
          unit: string | null
          unit_label: string
          unit_type: string | null
          updated_at: string
          views_count: number
        }
        Insert: {
          avg_rating?: number
          badges?: string[] | null
          category_id?: string | null
          cooking_tip?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          is_by_weight?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          is_popular?: boolean
          is_top_seller?: boolean
          low_stock_threshold?: number
          name: string
          name_ar?: string | null
          old_price?: number | null
          original_price?: number | null
          price?: number | null
          price_per_unit: number
          purchase_count?: number
          rating?: number | null
          reviews_count?: number
          stock?: number | null
          stock_quantity?: number
          unit?: string | null
          unit_label?: string
          unit_type?: string | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          avg_rating?: number
          badges?: string[] | null
          category_id?: string | null
          cooking_tip?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          is_by_weight?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          is_popular?: boolean
          is_top_seller?: boolean
          low_stock_threshold?: number
          name?: string
          name_ar?: string | null
          old_price?: number | null
          original_price?: number | null
          price?: number | null
          price_per_unit?: number
          purchase_count?: number
          rating?: number | null
          reviews_count?: number
          stock?: number | null
          stock_quantity?: number
          unit?: string | null
          unit_label?: string
          unit_type?: string | null
          updated_at?: string
          views_count?: number
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
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          reason: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          reason: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name: string
          comment: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          accent_color: string | null
          allow_signups: boolean
          announcement_bg_color: string | null
          announcement_enabled: boolean | null
          announcement_text: string | null
          background_color: string | null
          bank_account_info: string | null
          cart_empty_bg: string | null
          created_at: string
          dark_mode_enabled: boolean | null
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
          hero_cta_text: string
          hero_image_url: string | null
          hero_subtitle: string
          hero_title: string
          id: string
          instapay_handle: string | null
          login_bg_pattern: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          min_order_amount: number | null
          primary_color: string | null
          site_name: string | null
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          allow_signups?: boolean
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          background_color?: string | null
          bank_account_info?: string | null
          cart_empty_bg?: string | null
          created_at?: string
          dark_mode_enabled?: boolean | null
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
          hero_cta_text?: string
          hero_image_url?: string | null
          hero_subtitle?: string
          hero_title?: string
          id?: string
          instapay_handle?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number | null
          primary_color?: string | null
          site_name?: string | null
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          allow_signups?: boolean
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          background_color?: string | null
          bank_account_info?: string | null
          cart_empty_bg?: string | null
          created_at?: string
          dark_mode_enabled?: boolean | null
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
          hero_cta_text?: string
          hero_image_url?: string | null
          hero_subtitle?: string
          hero_title?: string
          id?: string
          instapay_handle?: string | null
          login_bg_pattern?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          min_order_amount?: number | null
          primary_color?: string | null
          site_name?: string | null
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
      store_settings_pulse: {
        Row: {
          id: number
          updated_at: string
        }
        Insert: {
          id?: number
          updated_at?: string
        }
        Update: {
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          accent_hex: string
          auth_bg_url: string | null
          card_radius_px: number
          cart_empty_bg_url: string | null
          created_at: string
          dark_marble_bg_url: string | null
          hero_cta_text: string | null
          hero_grid_images: Json
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          marble_bg_url: string | null
          primary_hex: string
          updated_at: string
        }
        Insert: {
          accent_hex?: string
          auth_bg_url?: string | null
          card_radius_px?: number
          cart_empty_bg_url?: string | null
          created_at?: string
          dark_marble_bg_url?: string | null
          hero_cta_text?: string | null
          hero_grid_images?: Json
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          marble_bg_url?: string | null
          primary_hex?: string
          updated_at?: string
        }
        Update: {
          accent_hex?: string
          auth_bg_url?: string | null
          card_radius_px?: number
          cart_empty_bg_url?: string | null
          created_at?: string
          dark_marble_bg_url?: string | null
          hero_cta_text?: string | null
          hero_grid_images?: Json
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          marble_bg_url?: string | null
          primary_hex?: string
          updated_at?: string
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
          foreground_color: string | null
          hero_bg_image: string | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string | null
          login_bg_pattern: string | null
          logo_url: string | null
          min_order_amount: number | null
          primary_color: string | null
          site_name: string | null
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string | null
          whatsapp_number: string | null
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
              p_idempotency_key: string
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
      get_store_settings_admin: {
        Args: never
        Returns: {
          accent_color: string | null
          allow_signups: boolean
          announcement_bg_color: string | null
          announcement_enabled: boolean | null
          announcement_text: string | null
          background_color: string | null
          bank_account_info: string | null
          cart_empty_bg: string | null
          created_at: string
          dark_mode_enabled: boolean | null
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
          hero_cta_text: string
          hero_image_url: string | null
          hero_subtitle: string
          hero_title: string
          id: string
          instapay_handle: string | null
          login_bg_pattern: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          min_order_amount: number | null
          primary_color: string | null
          site_name: string | null
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string
          whatsapp_number: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "store_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_views: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: {
          code: string
          discount_amount: number
          discount_type: string
          discount_value: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
