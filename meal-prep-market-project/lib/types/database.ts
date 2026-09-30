// lib/types/database.ts
//
// Placeholder types matching the cm_ schema. Replace this file by
// running, once your Supabase project is live:
//
//   supabase gen types typescript --project-id <your-project-ref> > lib/types/database.ts
//
// Kept hand-written for now so the rest of the frontend can be typed
// against something real while the project is being stood up.

export interface Database {
  public: {
    Tables: {
      cm_cooks: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          business_name: string;
          bio: string | null;
          abn: string | null;
          tier: "tier_1_in_home" | "tier_2_off_site";
          cuisine_tags: string[];
          dietary_specialty_tags: string[];
          price_range_min: number | null;
          price_range_max: number | null;
          profile_photo_url: string | null;
          public_contact_email: string | null;
          public_contact_phone: string | null;
          declaration_accepted: boolean;
          declaration_accepted_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      cm_cook_media: {
        Row: {
          id: string;
          cook_id: string;
          image_url: string;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
      };
      cm_packages: {
        Row: {
          id: string;
          cook_id: string;
          name: string;
          description: string | null;
          meal_count: number | null;
          indicative_price: number | null;
          dietary_tags: string[];
          is_available: boolean;
          sort_order: number;
          created_at: string;
        };
      };
      cm_vendor_stripe_accounts: {
        Row: {
          cook_id: string;
          stripe_connect_account_id: string;
          charges_enabled: boolean;
          payouts_enabled: boolean;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      cm_orders: {
        Row: {
          id: string;
          cook_id: string;
          client_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          status: "pending" | "paid" | "failed" | "refunded" | "canceled";
          currency: string;
          subtotal_amount: number;
          application_fee_amount: number | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          delivery_address: string | null;
          order_notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      cm_order_items: {
        Row: {
          id: string;
          order_id: string;
          package_id: string | null;
          item_name: string;
          unit_price: number;
          quantity: number;
          line_total: number;
        };
      };
      cm_reviews: {
        Row: {
          id: string;
          cook_id: string;
          client_id: string;
          inquiry_id: string | null;
          rating: number;
          review_text: string | null;
          is_hidden: boolean;
          hidden_reason: string | null;
          created_at: string;
        };
      };
      cm_clients: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          created_at: string;
        };
      };
      cm_inquiries: {
        Row: {
          id: string;
          cook_id: string;
          client_id: string;
          client_name: string;
          client_email: string;
          client_phone: string | null;
          message: string;
          magic_link_sent_at: string | null;
          email_notification_sent_at: string | null;
          created_at: string;
        };
      };
      cm_admins: {
        Row: {
          id: string;
          created_at: string;
        };
      };
    };
  };
}

// Convenience aliases used throughout the components below.
export type Cook = Database["public"]["Tables"]["cm_cooks"]["Row"];
export type CookMedia = Database["public"]["Tables"]["cm_cook_media"]["Row"];
export type Package = Database["public"]["Tables"]["cm_packages"]["Row"];
export type Review = Database["public"]["Tables"]["cm_reviews"]["Row"];
export type VendorStripeAccount = Database["public"]["Tables"]["cm_vendor_stripe_accounts"]["Row"];
export type Order = Database["public"]["Tables"]["cm_orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["cm_order_items"]["Row"];
