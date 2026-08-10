import { createClient } from "@supabase/supabase-js";

// These are public, publishable values for the linked Supabase project.
// They are safe to ship with the bundle; secrets must never be added here.
const PROD_SUPABASE_URL = "https://bmevvqkivylkyzerrhjk.supabase.co";
const PROD_SUPABASE_ANON_KEY =
  "sb_publishable_WuyMBwerywyBCVAdiw8lOw_ayJL0tnU";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROD_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
