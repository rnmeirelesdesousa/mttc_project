/**
 * Supabase Database Types
 * 
 * This file defines the TypeScript types for the Supabase database.
 * For now, we'll use a minimal type definition. In production, you can
 * generate this automatically using the Supabase CLI:
 * 
 * npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'public' | 'researcher' | 'admin';
          full_name: string | null;
          academic_affiliation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: 'public' | 'researcher' | 'admin';
          full_name?: string | null;
          academic_affiliation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'public' | 'researcher' | 'admin';
          full_name?: string | null;
          academic_affiliation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

