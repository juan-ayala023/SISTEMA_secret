import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// POST /api/sync/callback
// Lo llama n8n al terminar una corrida de sync para reportar el estado por canal.
// Auth: header x-mf-secret contra process.env.MF_SECRET.
// Escribe channel_sync_status con service_role (n8n no tiene sesión → salta RLS).

const PROPERTY_ID = '886d4492-6102-4874-8778-4051ff3eaa09'; // Secreto Suites (único hotel)
const VALID_CHANNELS = ['airbnb', 'booking', 'calendar'] as const;
const VALID_STATUSES = ['idle', 'running', 'ok', 'error'] as const;

export async function POST(request: Request) {
  // 1) Config
  const secret = process.env.MF_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'MF_SECRET no está configurado en el servidor.' },
      { status: 500 },
    );
  }

  // 2) Auth
  const provided = request.headers.get('x-mf-secret')?.trim() ?? '';
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // 3) Parsear y validar body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido (no es JSON).' }, { status: 400 });
  }

  const { channel, status, message, detail } = (body ?? {}) as {
    channel?: string;
    status?: string;
    message?: string;
    detail?: unknown;
  };

  if (!channel || !VALID_CHANNELS.includes(channel as never)) {
    return NextResponse.json(
      { error: `channel inválido. Esperado: ${VALID_CHANNELS.join(', ')}.` },
      { status: 400 },
    );
  }
  if (!status || !VALID_STATUSES.includes(status as never)) {
    return NextResponse.json(
      { error: `status inválido. Esperado: ${VALID_STATUSES.join(', ')}.` },
      { status: 400 },
    );
  }

  // 4) Upsert por (property_id, channel)
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('channel_sync_status')
    .upsert(
      {
        property_id: PROPERTY_ID,
        channel,
        status,
        message: message ?? null,
        detail: detail ?? null,
        last_run_at: now,
        triggered_by: 'webhook',
        ...(status === 'ok' ? { last_success_at: now } : {}),
      },
      { onConflict: 'property_id,channel' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
