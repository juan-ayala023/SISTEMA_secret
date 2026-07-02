'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { ROOM_STATUSES } from '@/lib/inventory/schema';
import type { RoomStatus } from '@/types/database';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Recepción y housekeeping pueden actualizar el estado de limpieza.
const ROLES = ['admin', 'manager', 'reception', 'housekeeping'] as const;

export async function setRoomStatus(
  roomId: string,
  status: RoomStatus,
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  if (!ROOM_STATUSES.includes(status)) {
    return { ok: false, error: 'Estado inválido' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', roomId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/housekeeping');
  revalidatePath('/');
  return { ok: true };
}
