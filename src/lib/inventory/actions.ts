'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import {
  roomSchema,
  roomTypeSchema,
  type RoomInput,
  type RoomTypeInput,
} from './schema';

// Resultado uniforme: los errores esperados se devuelven (no se lanzan) para
// que el cliente los muestre con un toast. Solo auth/permiso lanza.
export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ['admin', 'manager'] as const;

// ============================ ROOM TYPES ============================

export async function createRoomType(
  input: RoomTypeInput,
): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase.from('room_types').insert({
    property_id: profile.property_id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    base_occupancy: parsed.data.base_occupancy,
    max_occupancy: parsed.data.max_occupancy,
    base_rate: parsed.data.base_rate,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/room-types');
  revalidatePath('/settings/rooms');
  return { ok: true };
}

export async function updateRoomType(
  id: string,
  input: RoomTypeInput,
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const parsed = roomTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  // RLS (room_types_all) garantiza que solo se actualicen filas de la
  // propiedad del usuario; no hace falta filtrar property_id manualmente.
  const { error } = await supabase
    .from('room_types')
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      base_occupancy: parsed.data.base_occupancy,
      max_occupancy: parsed.data.max_occupancy,
      base_rate: parsed.data.base_rate,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/room-types');
  revalidatePath('/settings/rooms');
  return { ok: true };
}

export async function deleteRoomType(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  const { error } = await supabase.from('room_types').delete().eq('id', id);
  if (error) {
    // Reservas asociadas bloquean el borrado (FK sin cascada).
    return {
      ok: false,
      error: 'No se pudo eliminar: tiene reservas asociadas.',
    };
  }

  revalidatePath('/settings/room-types');
  revalidatePath('/settings/rooms');
  return { ok: true };
}

// ============================== ROOMS ==============================

export async function createRoom(input: RoomInput): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase.from('rooms').insert({
    property_id: profile.property_id,
    room_type_id: parsed.data.room_type_id,
    name: parsed.data.name,
    floor: parsed.data.floor || null,
    status: parsed.data.status,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/rooms');
  return { ok: true };
}

export async function updateRoom(
  id: string,
  input: RoomInput,
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('rooms')
    .update({
      room_type_id: parsed.data.room_type_id,
      name: parsed.data.name,
      floor: parsed.data.floor || null,
      status: parsed.data.status,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/rooms');
  return { ok: true };
}

export async function deleteRoom(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) {
    return {
      ok: false,
      error: 'No se pudo eliminar: tiene reservas asociadas.',
    };
  }

  revalidatePath('/settings/rooms');
  return { ok: true };
}
