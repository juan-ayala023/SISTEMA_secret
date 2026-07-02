'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { channelSchema, type ChannelInput } from './schema';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ['admin', 'manager'] as const;

export async function createChannel(input: ChannelInput): Promise<ActionResult> {
  const { profile } = await requireRole([...ROLES]);
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase.from('channel_connections').insert({
    property_id: profile.property_id,
    room_type_id: parsed.data.room_type_id,
    channel: parsed.data.channel,
    ical_import_url: parsed.data.ical_import_url || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/channels');
  return { ok: true };
}

export async function updateChannel(
  id: string,
  input: ChannelInput,
): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('channel_connections')
    .update({
      room_type_id: parsed.data.room_type_id,
      channel: parsed.data.channel,
      ical_import_url: parsed.data.ical_import_url || null,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/channels');
  return { ok: true };
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  await requireRole([...ROLES]);
  const supabase = await createClient();
  const { error } = await supabase
    .from('channel_connections')
    .delete()
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/channels');
  return { ok: true };
}
