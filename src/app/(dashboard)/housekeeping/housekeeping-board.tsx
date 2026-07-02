'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { setRoomStatus } from '@/lib/housekeeping/actions';
import { ROOM_STATUSES } from '@/lib/inventory/schema';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { Room, RoomStatus } from '@/types/database';

export type HkRoom = Room & { room_type: { name: string } | null };

const STATUS_META: Record<
  RoomStatus,
  { label: string; dot: string; active: string }
> = {
  clean: {
    label: 'Limpia',
    dot: 'bg-emerald-500',
    active: 'bg-emerald-600 text-white border-emerald-600',
  },
  dirty: {
    label: 'Sucia',
    dot: 'bg-orange-500',
    active: 'bg-orange-600 text-white border-orange-600',
  },
  inspected: {
    label: 'Inspeccionada',
    dot: 'bg-blue-500',
    active: 'bg-blue-600 text-white border-blue-600',
  },
  out_of_order: {
    label: 'Fuera de servicio',
    dot: 'bg-red-500',
    active: 'bg-red-600 text-white border-red-600',
  },
};

export function HousekeepingBoard({ rooms }: { rooms: HkRoom[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<RoomStatus, number> = {
      clean: 0,
      dirty: 0,
      inspected: 0,
      out_of_order: 0,
    };
    for (const r of rooms) c[r.status] += 1;
    return c;
  }, [rooms]);

  function change(room: HkRoom, status: RoomStatus) {
    if (room.status === status) return;
    setPendingId(room.id);
    startTransition(async () => {
      const res = await setRoomStatus(room.id, status);
      setPendingId(null);
      if (!res.ok) {
        toast.error('No se pudo actualizar', { description: res.error });
        return;
      }
      toast.success(`${room.name}: ${STATUS_META[status].label}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Housekeeping</h1>
        <p className="text-sm text-muted-foreground">
          Estado de limpieza de {rooms.length}{' '}
          {rooms.length === 1 ? 'habitación' : 'habitaciones'}.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ROOM_STATUSES.map((s) => (
          <div
            key={s}
            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
          >
            <span className={cn('size-2.5 rounded-full', STATUS_META[s].dot)} />
            <span className="text-lg font-semibold">{counts[s]}</span>
            <span className="text-xs text-muted-foreground">
              {STATUS_META[s].label}
            </span>
          </div>
        ))}
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Sparkles className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              No hay habitaciones. Créalas en Configuración → Habitaciones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.room_type?.name ?? 'Sin tipo'}
                      {room.floor ? ` · Piso ${room.floor}` : ''}
                    </p>
                  </div>
                  {pendingId === room.id && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ROOM_STATUSES.map((s) => {
                    const active = room.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={pendingId === room.id}
                        onClick={() => change(room, s)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                          active
                            ? STATUS_META[s].active
                            : 'border-border bg-background text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {!active && (
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              STATUS_META[s].dot,
                            )}
                          />
                        )}
                        {STATUS_META[s].label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
