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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          order_id: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_manufacturers: {
        Row: {
          capacity: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string | null
          email: string
          id: string
          linked_user_id: string | null
          notes: string | null
          state: string | null
          updated_at: string | null
          verified: boolean
        }
        Insert: {
          capacity?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          state?: string | null
          updated_at?: string | null
          verified?: boolean
        }
        Update: {
          capacity?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          linked_user_id?: string | null
          notes?: string | null
          state?: string | null
          updated_at?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      disputes: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturer_onboarding_requests: {
        Row: {
          capacity: string
          categories: string[]
          company_name: string
          contact_name: string
          email: string
          id: string
          location: string
          notes: string | null
          phone: string
          status: string
          submitted_at: string
          years_active: string | null
        }
        Insert: {
          capacity: string
          categories?: string[]
          company_name: string
          contact_name: string
          email: string
          id?: string
          location: string
          notes?: string | null
          phone: string
          status?: string
          submitted_at?: string
          years_active?: string | null
        }
        Update: {
          capacity?: string
          categories?: string[]
          company_name?: string
          contact_name?: string
          email?: string
          id?: string
          location?: string
          notes?: string | null
          phone?: string
          status?: string
          submitted_at?: string
          years_active?: string | null
        }
        Relationships: []
      }
      manufacturer_verifications: {
        Row: {
          capacity: string
          city: string | null
          company_name: string
          country: string | null
          email: string | null
          id: string
          location: string
          notes: string | null
          pause_reason: string | null
          paused: boolean | null
          paused_at: string | null
          paused_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soft_onboarded: boolean | null
          state: string | null
          status: string | null
          submitted_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          capacity: string
          city?: string | null
          company_name: string
          country?: string | null
          email?: string | null
          id?: string
          location: string
          notes?: string | null
          pause_reason?: string | null
          paused?: boolean | null
          paused_at?: string | null
          paused_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soft_onboarded?: boolean | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          capacity?: string
          city?: string | null
          company_name?: string
          country?: string | null
          email?: string | null
          id?: string
          location?: string
          notes?: string | null
          pause_reason?: string | null
          paused?: boolean | null
          paused_at?: string | null
          paused_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soft_onboarded?: boolean | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          event_timestamp: string
          event_type: string
          id: string
          metadata: Json | null
          order_id: string
        }
        Insert: {
          event_timestamp?: string
          event_type: string
          id?: string
          metadata?: Json | null
          order_id: string
        }
        Update: {
          event_timestamp?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_type: string
          file_name: string | null
          file_url: string | null
          id: string
          manufacturer_id: string | null
          metadata: Json | null
          order_id: string
          stage: string
          uploader_id: string | null
          uploader_role: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_type: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          manufacturer_id?: string | null
          metadata?: Json | null
          order_id: string
          stage: string
          uploader_id?: string | null
          uploader_role: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_type?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          manufacturer_id?: string | null
          metadata?: Json | null
          order_id?: string
          stage?: string
          uploader_id?: string | null
          uploader_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          order_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          order_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_qc: {
        Row: {
          admin_decision: string | null
          admin_decision_at: string | null
          admin_decision_by: string | null
          admin_notes: string | null
          created_at: string | null
          decision: string
          defect_severity: number | null
          defect_type: string | null
          file_urls: string[] | null
          id: string
          notes: string | null
          order_id: string
          reason_code: string | null
          reviewer: string
          reviewer_id: string | null
          stage: string
        }
        Insert: {
          admin_decision?: string | null
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_notes?: string | null
          created_at?: string | null
          decision: string
          defect_severity?: number | null
          defect_type?: string | null
          file_urls?: string[] | null
          id?: string
          notes?: string | null
          order_id: string
          reason_code?: string | null
          reviewer: string
          reviewer_id?: string | null
          stage: string
        }
        Update: {
          admin_decision?: string | null
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_notes?: string | null
          created_at?: string | null
          decision?: string
          defect_severity?: number | null
          defect_type?: string | null
          file_urls?: string[] | null
          id?: string
          notes?: string | null
          order_id?: string
          reason_code?: string | null
          reviewer?: string
          reviewer_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_qc_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_info: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          full_name: string
          id: string
          order_id: string
          phone: string
          pincode: string
          state: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string | null
          full_name: string
          id?: string
          order_id: string
          phone: string
          pincode: string
          state: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          full_name?: string
          id?: string
          order_id?: string
          phone?: string
          pincode?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_info_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_specs: {
        Row: {
          approved_sample_url: string | null
          color: string
          created_at: string | null
          fabric_type: string
          gsm: number
          id: string
          locked_by: string | null
          order_id: string
          print_position: string
          print_size: string
          print_type: string
          tolerance_mm: number
        }
        Insert: {
          approved_sample_url?: string | null
          color: string
          created_at?: string | null
          fabric_type: string
          gsm: number
          id?: string
          locked_by?: string | null
          order_id: string
          print_position: string
          print_size: string
          print_type: string
          tolerance_mm: number
        }
        Update: {
          approved_sample_url?: string | null
          color?: string
          created_at?: string | null
          fabric_type?: string
          gsm?: number
          id?: string
          locked_by?: string | null
          order_id?: string
          print_position?: string
          print_size?: string
          print_type?: string
          tolerance_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_specs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          acceptance_delay_hours: number | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_notes: string | null
          admin_qc_approved: boolean | null
          admin_qc_approved_at: string | null
          admin_qc_approved_by: string | null
          assigned_at: string | null
          back_design_url: string | null
          back_mockup_image: string | null
          bulk_order_confirmed_at: string | null
          bulk_qc_approved_at: string | null
          bulk_qc_delay_hours: number | null
          bulk_qc_uploaded_at: string | null
          bulk_qc_video_url: string | null
          bulk_status: string | null
          buyer_id: string
          buyer_notes: string | null
          buyer_purpose: Database["public"]["Enums"]["buyer_purpose"] | null
          buyer_type: Database["public"]["Enums"]["buyer_type"] | null
          concern_notes: string | null
          corrected_csv_url: string | null
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          delivery_cost: number | null
          delivery_delay_hours: number | null
          delivery_status: string | null
          design_explanation: string | null
          design_file_url: string | null
          design_size: string
          detailed_status:
            | Database["public"]["Enums"]["order_detailed_status"]
            | null
          dispatched_at: string | null
          escrow_amount: number | null
          escrow_locked_timestamp: string | null
          escrow_released_timestamp: string | null
          escrow_status: Database["public"]["Enums"]["escrow_status"] | null
          estimated_delivery_date: string | null
          expected_deadline: string | null
          fabric_type: string | null
          fabric_unit_price: number | null
          fake_payment_timestamp: string | null
          generated_preview: string | null
          google_drive_link: string | null
          id: string
          in_transit_at: string | null
          manufacturer_accept_time: string | null
          manufacturer_id: string | null
          mockup_image: string | null
          order_intent: Database["public"]["Enums"]["order_intent"] | null
          order_mode: Database["public"]["Enums"]["order_mode"] | null
          order_state: Database["public"]["Enums"]["order_state"] | null
          packaging_video_url: string | null
          packed_at: string | null
          payment_link: string | null
          payment_received_at: string | null
          payment_state: string | null
          payment_status: string | null
          pickup_scheduled_at: string | null
          product_category: string | null
          product_type: string
          qc_feedback: string | null
          qc_feedback_structured: string | null
          qc_files: string[] | null
          qc_status: string | null
          qc_uploaded_at: string | null
          qc_video_url: string | null
          quantity: number
          refund_reason: string | null
          refunded_at: string | null
          refunded_by: string | null
          rejection_reason: string | null
          sample_approved_at: string | null
          sample_order_placed_at: string | null
          sample_production_started_at: string | null
          sample_qc_approved_at: string | null
          sample_qc_delay_hours: number | null
          sample_qc_uploaded_at: string | null
          sample_qc_video_url: string | null
          sample_required: boolean | null
          sample_status: string | null
          sample_to_bulk_conversion: boolean | null
          selected_color: string | null
          size_chart_url: string | null
          specs_locked: boolean | null
          specs_locked_at: string | null
          specs_locked_by: string | null
          state_updated_at: string | null
          status: string
          total_amount: number | null
          total_order_value: number | null
          tracking_id: string | null
          updated_at: string
          upfront_payable_amount: number | null
        }
        Insert: {
          acceptance_delay_hours?: number | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_notes?: string | null
          admin_qc_approved?: boolean | null
          admin_qc_approved_at?: string | null
          admin_qc_approved_by?: string | null
          assigned_at?: string | null
          back_design_url?: string | null
          back_mockup_image?: string | null
          bulk_order_confirmed_at?: string | null
          bulk_qc_approved_at?: string | null
          bulk_qc_delay_hours?: number | null
          bulk_qc_uploaded_at?: string | null
          bulk_qc_video_url?: string | null
          bulk_status?: string | null
          buyer_id: string
          buyer_notes?: string | null
          buyer_purpose?: Database["public"]["Enums"]["buyer_purpose"] | null
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null
          concern_notes?: string | null
          corrected_csv_url?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_cost?: number | null
          delivery_delay_hours?: number | null
          delivery_status?: string | null
          design_explanation?: string | null
          design_file_url?: string | null
          design_size: string
          detailed_status?:
            | Database["public"]["Enums"]["order_detailed_status"]
            | null
          dispatched_at?: string | null
          escrow_amount?: number | null
          escrow_locked_timestamp?: string | null
          escrow_released_timestamp?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"] | null
          estimated_delivery_date?: string | null
          expected_deadline?: string | null
          fabric_type?: string | null
          fabric_unit_price?: number | null
          fake_payment_timestamp?: string | null
          generated_preview?: string | null
          google_drive_link?: string | null
          id?: string
          in_transit_at?: string | null
          manufacturer_accept_time?: string | null
          manufacturer_id?: string | null
          mockup_image?: string | null
          order_intent?: Database["public"]["Enums"]["order_intent"] | null
          order_mode?: Database["public"]["Enums"]["order_mode"] | null
          order_state?: Database["public"]["Enums"]["order_state"] | null
          packaging_video_url?: string | null
          packed_at?: string | null
          payment_link?: string | null
          payment_received_at?: string | null
          payment_state?: string | null
          payment_status?: string | null
          pickup_scheduled_at?: string | null
          product_category?: string | null
          product_type: string
          qc_feedback?: string | null
          qc_feedback_structured?: string | null
          qc_files?: string[] | null
          qc_status?: string | null
          qc_uploaded_at?: string | null
          qc_video_url?: string | null
          quantity?: number
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          rejection_reason?: string | null
          sample_approved_at?: string | null
          sample_order_placed_at?: string | null
          sample_production_started_at?: string | null
          sample_qc_approved_at?: string | null
          sample_qc_delay_hours?: number | null
          sample_qc_uploaded_at?: string | null
          sample_qc_video_url?: string | null
          sample_required?: boolean | null
          sample_status?: string | null
          sample_to_bulk_conversion?: boolean | null
          selected_color?: string | null
          size_chart_url?: string | null
          specs_locked?: boolean | null
          specs_locked_at?: string | null
          specs_locked_by?: string | null
          state_updated_at?: string | null
          status?: string
          total_amount?: number | null
          total_order_value?: number | null
          tracking_id?: string | null
          updated_at?: string
          upfront_payable_amount?: number | null
        }
        Update: {
          acceptance_delay_hours?: number | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_notes?: string | null
          admin_qc_approved?: boolean | null
          admin_qc_approved_at?: string | null
          admin_qc_approved_by?: string | null
          assigned_at?: string | null
          back_design_url?: string | null
          back_mockup_image?: string | null
          bulk_order_confirmed_at?: string | null
          bulk_qc_approved_at?: string | null
          bulk_qc_delay_hours?: number | null
          bulk_qc_uploaded_at?: string | null
          bulk_qc_video_url?: string | null
          bulk_status?: string | null
          buyer_id?: string
          buyer_notes?: string | null
          buyer_purpose?: Database["public"]["Enums"]["buyer_purpose"] | null
          buyer_type?: Database["public"]["Enums"]["buyer_type"] | null
          concern_notes?: string | null
          corrected_csv_url?: string | null
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_cost?: number | null
          delivery_delay_hours?: number | null
          delivery_status?: string | null
          design_explanation?: string | null
          design_file_url?: string | null
          design_size?: string
          detailed_status?:
            | Database["public"]["Enums"]["order_detailed_status"]
            | null
          dispatched_at?: string | null
          escrow_amount?: number | null
          escrow_locked_timestamp?: string | null
          escrow_released_timestamp?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"] | null
          estimated_delivery_date?: string | null
          expected_deadline?: string | null
          fabric_type?: string | null
          fabric_unit_price?: number | null
          fake_payment_timestamp?: string | null
          generated_preview?: string | null
          google_drive_link?: string | null
          id?: string
          in_transit_at?: string | null
          manufacturer_accept_time?: string | null
          manufacturer_id?: string | null
          mockup_image?: string | null
          order_intent?: Database["public"]["Enums"]["order_intent"] | null
          order_mode?: Database["public"]["Enums"]["order_mode"] | null
          order_state?: Database["public"]["Enums"]["order_state"] | null
          packaging_video_url?: string | null
          packed_at?: string | null
          payment_link?: string | null
          payment_received_at?: string | null
          payment_state?: string | null
          payment_status?: string | null
          pickup_scheduled_at?: string | null
          product_category?: string | null
          product_type?: string
          qc_feedback?: string | null
          qc_feedback_structured?: string | null
          qc_files?: string[] | null
          qc_status?: string | null
          qc_uploaded_at?: string | null
          qc_video_url?: string | null
          quantity?: number
          refund_reason?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          rejection_reason?: string | null
          sample_approved_at?: string | null
          sample_order_placed_at?: string | null
          sample_production_started_at?: string | null
          sample_qc_approved_at?: string | null
          sample_qc_delay_hours?: number | null
          sample_qc_uploaded_at?: string | null
          sample_qc_video_url?: string | null
          sample_required?: boolean | null
          sample_status?: string | null
          sample_to_bulk_conversion?: boolean | null
          selected_color?: string | null
          size_chart_url?: string | null
          specs_locked?: boolean | null
          specs_locked_at?: string | null
          specs_locked_by?: string | null
          state_updated_at?: string | null
          status?: string
          total_amount?: number | null
          total_order_value?: number | null
          tracking_id?: string | null
          updated_at?: string
          upfront_payable_amount?: number | null
        }
        Relationships: []
      }
      platform_metrics: {
        Row: {
          completed_orders: number | null
          created_at: string
          id: string
          metric_date: string
          pending_qc: number | null
          rejected_orders: number | null
          total_buyers: number | null
          total_manufacturers: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          completed_orders?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          pending_qc?: number | null
          rejected_orders?: number | null
          total_buyers?: number | null
          total_manufacturers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          completed_orders?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          pending_qc?: number | null
          rejected_orders?: number | null
          total_buyers?: number | null
          total_manufacturers?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          on_time_deliveries: number | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_type: string | null
          performance_score: number | null
          qc_pass_rate: number | null
          total_disputes: number | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id: string
          on_time_deliveries?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_type?: string | null
          performance_score?: number | null
          qc_pass_rate?: number | null
          total_disputes?: number | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          on_time_deliveries?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_type?: string | null
          performance_score?: number | null
          qc_pass_rate?: number | null
          total_disputes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
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
      app_role: "buyer" | "manufacturer" | "admin"
      buyer_purpose: "merch_bulk" | "blank_apparel" | "fabric_only"
      buyer_type: "campus" | "brand" | "fabric"
      delivery_state:
        | "NOT_STARTED"
        | "PACKED"
        | "PICKUP_SCHEDULED"
        | "IN_TRANSIT"
        | "DELIVERED"
      escrow_status: "pending" | "fake_paid" | "fake_released"
      order_detailed_status:
        | "created"
        | "submitted_to_manufacturer"
        | "accepted_by_manufacturer"
        | "rejected_by_manufacturer"
        | "sample_in_production"
        | "qc_uploaded"
        | "sample_approved_by_buyer"
        | "sample_rejected_by_buyer"
        | "bulk_in_production"
        | "dispatched"
        | "delivered"
        | "completed"
        | "sample_completed"
      order_intent: "sample_only" | "sample_then_bulk" | "direct_bulk"
      order_mode: "sample_only" | "sample_then_bulk" | "direct_bulk"
      order_state:
        | "DRAFT"
        | "SUBMITTED"
        | "ADMIN_APPROVED"
        | "MANUFACTURER_ASSIGNED"
        | "PAYMENT_REQUESTED"
        | "PAYMENT_CONFIRMED"
        | "SAMPLE_IN_PROGRESS"
        | "SAMPLE_QC_UPLOADED"
        | "SAMPLE_APPROVED"
        | "BULK_UNLOCKED"
        | "BULK_IN_PRODUCTION"
        | "BULK_QC_UPLOADED"
        | "READY_FOR_DISPATCH"
        | "DISPATCHED"
        | "DELIVERED"
        | "COMPLETED"
      payment_state:
        | "PAYMENT_INITIATED"
        | "PAYMENT_HELD"
        | "PAYMENT_RELEASABLE"
        | "PAYMENT_RELEASED"
        | "PAYMENT_REFUNDED"
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
      app_role: ["buyer", "manufacturer", "admin"],
      buyer_purpose: ["merch_bulk", "blank_apparel", "fabric_only"],
      buyer_type: ["campus", "brand", "fabric"],
      delivery_state: [
        "NOT_STARTED",
        "PACKED",
        "PICKUP_SCHEDULED",
        "IN_TRANSIT",
        "DELIVERED",
      ],
      escrow_status: ["pending", "fake_paid", "fake_released"],
      order_detailed_status: [
        "created",
        "submitted_to_manufacturer",
        "accepted_by_manufacturer",
        "rejected_by_manufacturer",
        "sample_in_production",
        "qc_uploaded",
        "sample_approved_by_buyer",
        "sample_rejected_by_buyer",
        "bulk_in_production",
        "dispatched",
        "delivered",
        "completed",
        "sample_completed",
      ],
      order_intent: ["sample_only", "sample_then_bulk", "direct_bulk"],
      order_mode: ["sample_only", "sample_then_bulk", "direct_bulk"],
      order_state: [
        "DRAFT",
        "SUBMITTED",
        "ADMIN_APPROVED",
        "MANUFACTURER_ASSIGNED",
        "PAYMENT_REQUESTED",
        "PAYMENT_CONFIRMED",
        "SAMPLE_IN_PROGRESS",
        "SAMPLE_QC_UPLOADED",
        "SAMPLE_APPROVED",
        "BULK_UNLOCKED",
        "BULK_IN_PRODUCTION",
        "BULK_QC_UPLOADED",
        "READY_FOR_DISPATCH",
        "DISPATCHED",
        "DELIVERED",
        "COMPLETED",
      ],
      payment_state: [
        "PAYMENT_INITIATED",
        "PAYMENT_HELD",
        "PAYMENT_RELEASABLE",
        "PAYMENT_RELEASED",
        "PAYMENT_REFUNDED",
      ],
    },
  },
} as const
