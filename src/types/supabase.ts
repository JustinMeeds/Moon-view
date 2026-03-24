export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          updated_at?: string;
        };
      };
      saved_locations: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          lat: number;
          lng: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          lat: number;
          lng: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          lat?: number;
          lng?: number;
        };
      };
      app_preferences: {
        Row: {
          user_id: string;
          use_24h: boolean;
          use_cardinal: boolean;
          default_location_id: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          use_24h?: boolean;
          use_cardinal?: boolean;
          default_location_id?: string | null;
          updated_at?: string;
        };
        Update: {
          use_24h?: boolean;
          use_cardinal?: boolean;
          default_location_id?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
