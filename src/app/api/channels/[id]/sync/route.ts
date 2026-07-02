import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { runChannelSync } from '@/lib/channels/sync';

// POST /api/channels/[id]/sync
// Dispara la sincronización iCal de una conexión desde un sistema externo
// (p. ej. un cron de n8n). Autenticación por token en header:
//   Authorization: Bearer <SYNC_TOKEN>
// El token vive en la variable de entorno SYNC_TOKEN del servidor.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1) Validar el token ANTES de cualquier operación.
  const token = process.env.SYNC_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'SYNC_TOKEN no está configurado en el servidor.' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!provided || provided !== token) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // 2) Ejecutar el core con service_role (n8n no tiene sesión → salta RLS).
  const { id } = await params;
  const supabase = createServiceClient();
  const result = await runChannelSync(supabase, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    imported: result.imported,
    updated: result.updated,
    ignored: result.ignored,
  });
}
