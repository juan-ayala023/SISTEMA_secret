import { addDays, format, parseISO } from 'date-fns';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { todayInTZ } from '@/lib/utils/dates';
import { TapeChart, type TapeReservation, type TapeRoom } from './tape-chart';

const WINDOW_DAYS = 14;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { profile } = await requireRole(['admin', 'manager', 'reception']);
  const propertyId = profile.property_id!;
  const sp = await searchParams;

  const today = todayInTZ();
  const start = sp.start || today;
  const endExclusive = format(addDays(parseISO(start), WINDOW_DAYS), 'yyyy-MM-dd');

  const supabase = await createClient();
  const [roomsRes, resRes] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, room_type:room_types(name)')
      .eq('property_id', propertyId)
      .order('name'),
    supabase
      .from('reservations')
      .select(
        'id, room_id, check_in, check_out, status, guest:guests(first_name, last_name)',
      )
      .eq('property_id', propertyId)
      .not('room_id', 'is', null)
      .lt('check_in', endExclusive)
      .gt('check_out', start),
  ]);

  // supabase-js tipa las relaciones embebidas como arrays; en una relación
  // a-uno el runtime devuelve un objeto, así que casteamos vía `unknown`.
  const rooms =
    (roomsRes.data as unknown as (TapeRoom & {
      room_type: { name: string } | null;
    })[]) ?? [];

  const rawReservations = (resRes.data ?? []) as unknown as {
    id: string;
    room_id: string;
    check_in: string;
    check_out: string;
    status: string;
    guest: { first_name: string; last_name: string | null } | null;
  }[];

  // Excluimos canceladas / no-show (no ocupan la habitación).
  const reservations: TapeReservation[] = rawReservations
    .filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
    .map((r) => ({
      id: r.id,
      room_id: r.room_id,
      check_in: r.check_in,
      check_out: r.check_out,
      status: r.status as TapeReservation['status'],
      guest: r.guest
        ? [r.guest.first_name, r.guest.last_name].filter(Boolean).join(' ')
        : 'Sin huésped',
    }));

  return (
    <TapeChart
      rooms={rooms as TapeRoom[]}
      reservations={reservations}
      start={start}
      days={WINDOW_DAYS}
      today={today}
    />
  );
}
