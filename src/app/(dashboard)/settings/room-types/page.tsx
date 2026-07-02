import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { RoomType } from '@/types/database';
import { RoomTypeManager } from './room-type-manager';

export default async function RoomTypesPage() {
  const { profile } = await requireRole(['admin', 'manager']);

  const supabase = await createClient();
  const { data } = await supabase
    .from('room_types')
    .select('*')
    .eq('property_id', profile.property_id!)
    .order('name');

  return <RoomTypeManager items={(data as RoomType[]) ?? []} />;
}
