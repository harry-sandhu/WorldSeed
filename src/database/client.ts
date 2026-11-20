import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig, supabasePublicConfig } from "./config.js";

export function createPublicSupabaseClient(): SupabaseClient {
  const config = supabasePublicConfig();
  return createClient(config.url, config.publishableKey, { auth: { persistSession: false } });
}

/** Server/worker only. The secret key bypasses RLS and must never enter browser code. */
export function createWorkerSupabaseClient(): SupabaseClient {
  const config = supabaseConfig();
  return createClient(config.url, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
