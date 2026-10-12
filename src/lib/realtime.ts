"use client";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

export interface Presence {
  device: string;
  viewing: string | null;
  net: string | null;
  at: number;
}

export type { RealtimeChannel };
