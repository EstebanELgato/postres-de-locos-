import { createClient } from "@supabase/supabase-js";

function isPlaceholder(value?: string) {
  if (!value) return true;

  return /tu_|placeholder|example|anon_key|service_role_key/i.test(value);
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isPlaceholder(supabaseUrl) || isPlaceholder(serviceRoleKey)) {
    throw new Error("Supabase no esta configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
