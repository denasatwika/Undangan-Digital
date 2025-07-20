const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Membuat client Supabase
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);