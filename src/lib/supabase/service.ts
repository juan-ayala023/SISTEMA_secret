import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con service_role: SALTA RLS. Úsalo SOLO en el servidor
// (Route Handlers) y NUNCA lo importes en código de cliente. La key no lleva
// prefijo NEXT_PUBLIC_, por lo que nunca se envía al navegador.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
