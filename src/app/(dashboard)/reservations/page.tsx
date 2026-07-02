import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { Reservation } from '@/types/database';
import {
  ReservationManager,
  type ReservationRow,
  type GuestOption,
  type RoomOption,
  type RoomTypeOption,
} from './reservation-manager';

export default async function ReservationsPage() {
  const { profile } = await requireRole(['admin', 'manager', 'reception']);
  const propertyId = profile.property_id!;

  const supabase = await createClient();
  const [resRes, typesRes, roomsRes, guestsRes] = await Promise.all([
    supabase
      .from('reservations')
      .select(
        '*, guest:guests(id, first_name, last_name), room:rooms(name), room_type:room_types(name)',
      )
      .eq('property_id', propertyId)
      .order('check_in', { ascending: false }),
    supabase
      .from('room_types')
      .select('id, name')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('rooms')
      .select('id, name, room_type_id')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('guests')
      .select('id, first_name, last_name')
      .eq('property_id', propertyId)
      .order('first_name'),
  ]);

  const reservations =
    (resRes.data as (Reservation & {
      guest: { id: string; first_name: string; last_name: string | null } | null;
      room: { name: string } | null;
      room_type: { name: string } | null;
    })[]) ?? [];

  return (
    <ReservationManager
      reservations={reservations as ReservationRow[]}
      roomTypes={(typesRes.data as RoomTypeOption[]) ?? []}
      rooms={(roomsRes.data as RoomOption[]) ?? []}
      guests={(guestsRes.data as GuestOption[]) ?? []}
    />
  );
}
