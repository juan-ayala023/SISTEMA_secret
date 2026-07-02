import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { Room } from '@/types/database';
import { RoomManager, type RoomRow } from './room-manager';

export default async function RoomsPage() {
  const { profile } = await requireRole(['admin', 'manager']);
  const propertyId = profile.property_id!;

  const supabase = await createClient();
  const [roomsRes, typesRes] = await Promise.all([
    supabase
      .from('rooms')
      .select('*, room_type:room_types(name)')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('room_types')
      .select('id, name')
      .eq('property_id', propertyId)
      .order('name'),
  ]);

  const rooms = (roomsRes.data as (Room & { room_type: { name: string } | null })[]) ?? [];

  return (
    <RoomManager
      rooms={rooms as RoomRow[]}
      roomTypes={(typesRes.data as { id: string; name: string }[]) ?? []}
    />
  );
}
