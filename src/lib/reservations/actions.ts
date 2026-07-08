'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import {
  reservationSchema,
  RESERVATION_STATUSES,
  type ReservationInput,
} from './schema';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ['admin', 'manager', 'reception'] as const;
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Máquina de transiciones de estado. Claves literales con exhaustividad
// garantizada por Record<ReservationStatus, …>: si falta o sobra una clave el
// compilador falla, sin depender del orden de RESERVATION_STATUSES. Los estados
// terminales (checked_out, cancelled, no_show) no admiten ninguna transición.
type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
const STATUS_TRANSITIONS: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out', 'cancelled'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

// Traduce errores de constraints de Postgres a mensajes de usuario.
function mapDbError(code?: string, fallback = 'Error al guardar'): string {
  if (code === '23P01') return 'La habitación ya está ocupada en esas fechas.';
  if (code === '23514') return 'Revisa las fechas de la reserva.';
  return fallback;
}

// Devuelve el guest_id a usar: crea uno nuevo si corresponde, o el existente.
async function resolveGuestId(
  supabase: SupabaseServer,
  propertyId: string,
  data: ReservationInput,
): Promise<{ id: string | null } | { error: string }> {
  if (data.create_new_guest) {
    const { data: g, error } = await supabase
      .from('guests')
      .insert({
        property_id: propertyId,
        first_name: data.new_guest_first_name!.trim(),
        last_name: data.new_guest_last_name?.trim() || null,
        phone: data.new_guest_phone?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return { error: 'No se pudo crear el huésped.' };
    return { id: g.id as string };
  }
  return { id: data.guest_id ? data.guest_id : null };
}

function rowFrom(data: ReservationInput, guestId: string | null) {
  return {
    guest_id: guestId,
    room_type_id: data.room_type_id,
    room_id: data.room_id || null,
    check_in: data.check_in,
    check_out: data.check_out,
    adults: data.adults,
    children: data.children,
    source: data.source,
    status: data.status,
    total_amount: data.total_amount,
    balance: data.total_amount,
    notes: data.notes?.trim() || null,
  };
}

export async function createReservation(
  input: ReservationInput,
): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const data = parsed.data;

  const supabase = await createClient();
  const guest = await resolveGuestId(supabase, profile.property_id!, data);
  if ('error' in guest) return { ok: false, error: guest.error };

  const { error } = await supabase.from('reservations').insert({
    property_id: profile.property_id,
    ...rowFrom(data, guest.id),
  });
  if (error) return { ok: false, error: mapDbError(error.code) };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}

export async function updateReservation(
  id: string,
  input: ReservationInput,
): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const data = parsed.data;

  const supabase = await createClient();
  const guest = await resolveGuestId(supabase, profile.property_id!, data);
  if ('error' in guest) return { ok: false, error: guest.error };

  const { error } = await supabase
    .from('reservations')
    .update(rowFrom(data, guest.id))
    .eq('id', id);
  if (error) return { ok: false, error: mapDbError(error.code) };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}

export async function setReservationStatus(
  id: string,
  status: (typeof RESERVATION_STATUSES)[number],
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  if (!RESERVATION_STATUSES.includes(status)) {
    return { ok: false, error: 'Estado inválido' };
  }

  const supabase = await createClient();

  // Lee el estado actual. Si no existe o RLS la oculta, data es null.
  const { data: current } = await supabase
    .from('reservations')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!current) return { ok: false, error: 'Reserva no encontrada' };

  const actual = current.status as ReservationStatus;

  // No-op idempotente: mismo estado, no se toca la DB.
  if (actual === status) return { ok: true };

  // Guard de transición: el destino debe estar permitido desde el actual.
  if (!STATUS_TRANSITIONS[actual].includes(status)) {
    return {
      ok: false,
      error: `No se puede cambiar de ${actual} a ${status}`,
    };
  }

  // Al pasar a checked_out, un trigger marca la habitación como 'dirty'.
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id);
  if (error) return { ok: false, error: mapDbError(error.code) };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteReservation(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) return { ok: false, error: 'No se pudo eliminar la reserva.' };

  revalidatePath('/reservations');
  revalidatePath('/');
  return { ok: true };
}
