/**
 * What someone can do with books that aren't theirs.
 * `owner` isn't stored — it's what you are when the books are your own.
 */
export type ShareRole = "editor" | "viewer";
export type AccessRole = "owner" | ShareRole;

/** Row returned by consume_extraction() / the shape the 402 body is built from. */
export type QuotaGateRow = {
  allowed: boolean;
  used: number;
  cap: number;
  reason: string;
};

export type Database = {
  public: {
    // NOTE: these must be EMPTY key maps, not Record<string, never> — the
    // latter claims every possible name is a View, which shadows the real
    // tables and resolves them all to `never`.
    Views: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };

    // Postgres functions (supabase/trial_quota_setup.sql, webapp_setup.sql).
    // supabase-js needs these declared or .rpc() is untyped — and without the
    // Views/Functions/Enums keys present at all, it resolves every table to
    // `never`, which is what forced the `as any` casts elsewhere in this repo.
    Functions: {
      consume_extraction: {
        Args: Record<PropertyKey, never>;
        Returns: QuotaGateRow[];
      };
      refund_extraction: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      extraction_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          status: string;
          trial_days_left: number;
          used_today: number;
          daily_cap: number;
          remaining_today: number;
        }[];
      };
      consume_demo_extraction: {
        Args: { p_cap: number };
        Returns: { allowed: boolean; used: number; cap: number }[];
      };
      accept_share: {
        Args: { p_token: string };
        Returns: { ok: boolean; owner_user_id: string | null; message: string }[];
      };
      shared_books: {
        Args: Record<PropertyKey, never>;
        Returns: { owner_user_id: string; owner_name: string; role: ShareRole }[];
      };
    };

    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          currency: string;
          vat_number: string | null;
          vat_liable: boolean;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          currency?: string;
          vat_number?: string | null;
          vat_liable?: boolean;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          currency?: string;
          vat_number?: string | null;
          vat_liable?: boolean;
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          business_id: string | null;
          type: string;
          config: Record<string, unknown> | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          type: string;
          config?: Record<string, unknown> | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          type?: string;
          config?: Record<string, unknown> | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          business_id: string | null;
          type: "income" | "expense";
          document_type: "invoice" | "bill";
          status: "pending" | "paid" | "unpaid";
          counterparty: string | null;
          description: string | null;
          amount: number;
          currency: string;
          vat_amount: number | null; // TODO: MWST — nullable, hidden in UI for now
          vat_rate: number | null; // TODO: MWST — nullable, hidden in UI for now
          payment_method: "cash" | "bank" | "twint" | "card" | "other" | null;
          document_ref: string | null;
          document_date: string | null;
          due_date: string | null;
          duplicate_hash: string | null;
          verified: boolean;
          raw_extraction: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          type: "income" | "expense";
          document_type: "invoice" | "bill";
          status?: "pending" | "paid" | "unpaid";
          counterparty?: string | null;
          description?: string | null;
          amount: number;
          currency?: string;
          vat_amount?: number | null;
          vat_rate?: number | null;
          payment_method?: "cash" | "bank" | "twint" | "card" | "other" | null;
          document_ref?: string | null;
          document_date?: string | null;
          due_date?: string | null;
          duplicate_hash?: string | null;
          verified?: boolean;
          raw_extraction?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          type?: "income" | "expense";
          document_type?: "invoice" | "bill";
          status?: "pending" | "paid" | "unpaid";
          counterparty?: string | null;
          description?: string | null;
          amount?: number;
          currency?: string;
          vat_amount?: number | null;
          vat_rate?: number | null;
          payment_method?: "cash" | "bank" | "twint" | "card" | "other" | null;
          document_ref?: string | null;
          document_date?: string | null;
          due_date?: string | null;
          duplicate_hash?: string | null;
          verified?: boolean;
          raw_extraction?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          transaction_id: string | null;
          storage_path: string | null;
          file_type: "image" | "pdf" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          storage_path?: string | null;
          file_type?: "image" | "pdf" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          storage_path?: string | null;
          file_type?: "image" | "pdf" | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sync_log: {
        Row: {
          id: string;
          transaction_id: string | null;
          integration_id: string | null;
          synced_at: string;
          status: "success" | "failed" | null;
          error: string | null;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          integration_id?: string | null;
          synced_at?: string;
          status?: "success" | "failed" | null;
          error?: string | null;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          integration_id?: string | null;
          synced_at?: string;
          status?: "success" | "failed" | null;
          error?: string | null;
        };
        Relationships: [];
      };

      // ---- Cross-platform app tables (see supabase/app_data_setup.sql and
      // supabase/webapp_setup.sql). These are the tables the mobile app and the
      // hidden web app SHARE — same rows, same auth.uid(). The v1 tables above
      // (businesses/transactions/…) are the older web-only model.
      app_profiles: {
        Row: {
          user_id: string;
          name: string;
          currency: string;
          onboarded_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name?: string;
          currency?: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          currency?: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_hustles: {
        Row: {
          user_id: string;
          id: string;
          name: string;
          color: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          id: string;
          name: string;
          color?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          id?: string;
          name?: string;
          color?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Shared access — see supabase/sharing_setup.sql.
      app_shares: {
        Row: {
          id: string;
          owner_user_id: string;
          member_user_id: string | null;
          invite_email: string;
          role: ShareRole;
          status: "pending" | "accepted" | "revoked";
          token: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          member_user_id?: string | null;
          invite_email: string;
          role: ShareRole;
          status?: "pending" | "accepted" | "revoked";
          token?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          member_user_id?: string | null;
          invite_email?: string;
          role?: ShareRole;
          status?: "pending" | "accepted" | "revoked";
          token?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };

      // Customer-toggleable modules — see supabase/modules_setup.sql.
      // Secrets live in app_integration_secrets (service-role only) and are
      // deliberately kept out of anything the browser can read.
      app_integrations: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          hustle_id: string | null;
          active: boolean;
          config: Record<string, string>;
          status: string;
          last_sync_at: string | null;
          last_error: string | null;
          cursor: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          hustle_id?: string | null;
          active?: boolean;
          config?: Record<string, string>;
          status?: string;
          last_sync_at?: string | null;
          last_error?: string | null;
          cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          hustle_id?: string | null;
          active?: boolean;
          config?: Record<string, string>;
          status?: string;
          last_sync_at?: string | null;
          last_error?: string | null;
          cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_integration_secrets: {
        Row: { integration_id: string; secrets: Record<string, string>; updated_at: string };
        Insert: {
          integration_id: string;
          secrets?: Record<string, string>;
          updated_at?: string;
        };
        Update: {
          integration_id?: string;
          secrets?: Record<string, string>;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_transactions: {
        Row: {
          user_id: string;
          id: string;
          title: string;
          meta: string;
          /** Signed: positive = income, negative = expense (mobile's shape). */
          amount: number;
          status: string;
          hustle_id: string;
          date: string;
          /** Storage object path in the private `receipts` bucket. */
          image_path: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          id: string;
          title?: string;
          meta?: string;
          amount?: number;
          status?: string;
          hustle_id?: string;
          date: string;
          image_path?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          id?: string;
          title?: string;
          meta?: string;
          amount?: number;
          status?: string;
          hustle_id?: string;
          date?: string;
          image_path?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
};

// Convenience aliases
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type Integration = Database["public"]["Tables"]["integrations"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type SyncLog = Database["public"]["Tables"]["sync_log"]["Row"];

// Cross-platform app aliases
export type AppProfile = Database["public"]["Tables"]["app_profiles"]["Row"];
export type AppHustle = Database["public"]["Tables"]["app_hustles"]["Row"];
export type AppTransaction = Database["public"]["Tables"]["app_transactions"]["Row"];
