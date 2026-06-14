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
      profiles: {
        Row: {
          user_id: string
          email: string | null
          phone_number: string | null
          role: 'owner' | 'super_admin'
          created_at: string
          updated_at?: string | null
        }
        Insert: {
          user_id: string
          email?: string | null
          phone_number?: string | null
          role?: 'owner' | 'super_admin'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          email?: string | null
          phone_number?: string | null
          role?: 'owner' | 'super_admin'
          created_at?: string
          updated_at?: string | null
        }
      }
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          theme_id: string
          status: 'active' | 'paused' | 'pending'
          logo_url: string | null
          expires_at: string | null
          facebook_url: string | null
          instagram_url: string | null
          twitter_url: string | null
          whatsapp_number: string | null
          website_url: string | null
          primary_color: string | null
          wheel_enabled: boolean
          wheel_visible: boolean
          design_settings: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          theme_id?: string
          status?: 'active' | 'paused'
          logo_url?: string | null
          expires_at?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          twitter_url?: string | null
          whatsapp_number?: string | null
          website_url?: string | null
          primary_color?: string | null
          wheel_enabled?: boolean
          wheel_visible?: boolean
          design_settings?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          theme_id?: string
          status?: 'active' | 'paused'
          logo_url?: string | null
          expires_at?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          twitter_url?: string | null
          whatsapp_number?: string | null
          website_url?: string | null
          primary_color?: string | null
          wheel_enabled?: boolean
          wheel_visible?: boolean
          design_settings?: Json | null
          created_at?: string
        }
      }
      themes: {
        Row: {
          id: string
          name: string
          preview_image: string | null
        }
        Insert: {
          id: string
          name: string
          preview_image?: string | null
        }
        Update: {
          id?: string
          name?: string
          preview_image?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          business_id: string
          name: string
          position: number | null
          image_url: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          position?: number | null
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          position?: number | null
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          price: number | null
          available: boolean
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price?: number | null
          available?: boolean
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number | null
          available?: boolean
          image_url?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          business_id: string
          ends_at: string
          status: 'active' | 'expired' | 'paused'
          created_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          ends_at: string
          status?: 'active' | 'expired' | 'paused'
          created_at?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          ends_at?: string
          status?: 'active' | 'expired' | 'paused'
          created_at?: string
          updated_at?: string
        }
      }
      wheel_prizes: {
        Row: {
          id: string
          business_id: string
          label: string
          weight: number
          is_winning: boolean
          stock: number | null
          stock_remaining: number | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          label: string
          weight: number
          is_winning?: boolean
          stock?: number | null
          stock_remaining?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          label?: string
          weight?: number
          is_winning?: boolean
          stock?: number | null
          stock_remaining?: number | null
          created_at?: string
        }
      }
      menu_views: {
        Row: {
          id: string
          business_id: string
          viewed_at: string
          device_type: 'mobile' | 'desktop' | 'unknown'
        }
        Insert: {
          id?: string
          business_id: string
          viewed_at?: string
          device_type?: 'mobile' | 'desktop' | 'unknown'
        }
        Update: {
          id?: string
          business_id?: string
          viewed_at?: string
          device_type?: 'mobile' | 'desktop' | 'unknown'
        }
      }
      wheel_tickets: {
        Row: {
          id: string
          business_id: string
          prize_label: string
          ticket_code: string
          issued_at: string
          expires_at: string | null
          redeemed: boolean
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          prize_label: string
          ticket_code: string
          issued_at?: string
          expires_at?: string | null
          redeemed?: boolean
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          prize_label?: string
          ticket_code?: string
          issued_at?: string
          expires_at?: string | null
          redeemed?: boolean
          redeemed_at?: string | null
        }
      }
      images: {
        Row: {
          id: string
          public_id: string
          image_url: string
          format: string | null
          width: number | null
          height: number | null
          bytes: number | null
          folder: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          public_id: string
          image_url: string
          format?: string | null
          width?: number | null
          height?: number | null
          bytes?: number | null
          folder?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          public_id?: string
          image_url?: string
          format?: string | null
          width?: number | null
          height?: number | null
          bytes?: number | null
          folder?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

