import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { Guest } from '@/types/database';
import { GuestManager } from './guest-manager';

export default async function GuestsPage() {
  const { profile } = await requireRole(['admin', 'manager', 'reception']);

  const supabase = await createClient();
  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('property_id', profile.property_id!)
    .order('created_at', { ascending: false });

  return <GuestManager items={(data as Guest[]) ?? []} />;
}
