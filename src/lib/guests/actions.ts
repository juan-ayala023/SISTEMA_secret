'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { guestSchema, type GuestInput } from './schema';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ['admin', 'manager', 'reception'] as const;

// Normaliza los opcionales vacíos a null para la base de datos.
function clean(input: GuestInput) {
  const nn = (v?: string) => (v && v.trim() ? v.trim() : null);
  return {
    first_name: input.first_name.trim(),
    last_name: nn(input.last_name),
    email: nn(input.email),
    phone: nn(input.phone),
    document_id: nn(input.document_id),
    nationality: nn(input.nationality),
    notes: nn(input.notes),
  };
}

export async function createGuest(input: GuestInput): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase.from('guests').insert({
    property_id: profile.property_id,
    ...clean(parsed.data),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/guests');
  return { ok: true };
}

export async function updateGuest(
  id: string,
  input: GuestInput,
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  // RLS (guests_all) restringe la fila a la propiedad del usuario.
  const { error } = await supabase
    .from('guests')
    .update(clean(parsed.data))
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/guests');
  return { ok: true };
}

export async function deleteGuest(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  // Las reservas referencian guest con ON DELETE SET NULL: no bloquea, pero
  // la reserva queda sin huésped asociado.
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/guests');
  return { ok: true };
}
