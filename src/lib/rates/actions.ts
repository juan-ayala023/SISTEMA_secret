'use server';

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { rateBulkSchema, type RateBulkInput } from './schema';

export type ActionResult = { ok: true; count?: number } | { ok: false; error: string };

const ROLES = ['admin', 'manager'] as const;
const MAX_DAYS = 366;

export async function upsertRates(input: RateBulkInput): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const parsed = rateBulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };
  const d = parsed.data;

  const span = differenceInCalendarDays(parseISO(d.to), parseISO(d.from)) + 1;
  if (span > MAX_DAYS) {
    return { ok: false, error: `Rango demasiado amplio (máx. ${MAX_DAYS} días).` };
  }

  const rows = Array.from({ length: span }, (_, i) => ({
    room_type_id: d.room_type_id,
    date: format(addDays(parseISO(d.from), i), 'yyyy-MM-dd'),
    price: d.price,
    min_stay: d.min_stay,
    closed: d.closed,
  }));

  const supabase = await createClient();
  // RLS (rates_all) valida que el tipo pertenezca a la propiedad del usuario.
  const { error } = await supabase
    .from('rates')
    .upsert(rows, { onConflict: 'room_type_id,date' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/rates');
  return { ok: true, count: rows.length };
}

export async function deleteRate(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  const { error } = await supabase.from('rates').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/rates');
  return { ok: true };
}
