import type { SupabaseClient } from '@supabase/supabase-js';
import { parseIcal } from './ical';

// Núcleo de sincronización iCal, compartido por la Server Action (cliente RLS
// con sesión) y el Route Handler para n8n (cliente service_role). Recibe el
// cliente ya construido; no sabe de auth ni de revalidación.
export type SyncResult =
  | { ok: true; imported: number; updated: number; ignored: number }
  | { ok: false; error: string };

export async function runChannelSync(
  supabase: SupabaseClient,
  connectionId: string,
): Promise<SyncResult> {
  const { data: conn } = await supabase
    .from('channel_connections')
    .select('id, property_id, room_type_id, channel, ical_import_url')
    .eq('id', connectionId)
    .single();
  if (!conn) return { ok: false, error: 'Conexión no encontrada.' };
  if (!conn.ical_import_url) {
    return { ok: false, error: 'Esta conexión no tiene URL iCal.' };
  }
  if (!/^https?:\/\//i.test(conn.ical_import_url)) {
    return { ok: false, error: 'La URL iCal debe empezar con http(s).' };
  }

  // Descarga el iCal.
  let text: string;
  try {
    const res = await fetch(conn.ical_import_url, { cache: 'no-store' });
    if (!res.ok) {
      return { ok: false, error: `El servidor iCal respondió ${res.status}.` };
    }
    text = await res.text();
  } catch {
    return { ok: false, error: 'No se pudo descargar el iCal.' };
  }

  const events = parseIcal(text);

  // Reservas existentes de este canal/propiedad indexadas por external_uid.
  const existing = new Map<string, string>();
  const { data: rows } = await supabase
    .from('reservations')
    .select('id, external_uid')
    .eq('property_id', conn.property_id)
    .eq('source', conn.channel)
    .not('external_uid', 'is', null);
  for (const r of rows ?? []) {
    if (r.external_uid) existing.set(r.external_uid as string, r.id as string);
  }

  let imported = 0;
  let updated = 0;
  let ignored = 0;

  for (const ev of events) {
    // Ignora eventos sin UID/fechas válidas o con rango inválido.
    if (!ev.uid || !ev.start || !ev.end || ev.end <= ev.start) {
      ignored += 1;
      continue;
    }

    const existingId = existing.get(ev.uid);
    if (existingId) {
      const { error } = await supabase
        .from('reservations')
        .update({
          room_type_id: conn.room_type_id,
          check_in: ev.start,
          check_out: ev.end,
          notes: ev.summary || null,
        })
        .eq('id', existingId);
      if (error) ignored += 1;
      else updated += 1;
    } else {
      const { error } = await supabase.from('reservations').insert({
        property_id: conn.property_id,
        room_type_id: conn.room_type_id,
        room_id: null,
        guest_id: null,
        check_in: ev.start,
        check_out: ev.end,
        status: 'confirmed',
        source: conn.channel,
        external_uid: ev.uid,
        adults: 1,
        children: 0,
        total_amount: 0,
        balance: 0,
        notes: ev.summary || null,
      });
      if (error) ignored += 1;
      else imported += 1;
    }
  }

  await supabase
    .from('channel_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connectionId);

  return { ok: true, imported, updated, ignored };
}
