import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { Room } from '@/types/database';
import { HousekeepingBoard, type HkRoom } from './housekeeping-board';

export default async function HousekeepingPage() {
  const { profile } = await requireRole([
    'admin',
    'manager',
    'reception',
    'housekeeping',
  ]);

  const supabase = await createClient();
  const { data } = await supabase
    .from('rooms')
    .select('*, room_type:room_types(name)')
    .eq('property_id', profile.property_id!)
    .order('name');

  const rooms =
    (data as (Room & { room_type: { name: string } | null })[]) ?? [];

  return <HousekeepingBoard rooms={rooms as HkRoom[]} />;
}
