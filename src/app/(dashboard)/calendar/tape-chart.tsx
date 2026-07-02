'use client';

import Link from 'next/link';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BedDouble, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ReservationStatus } from '@/types/database';

export type TapeRoom = {
  id: string;
  name: string;
  room_type: { name: string } | null;
};
export type TapeReservation = {
  id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  guest: string;
};

const CELL = 46; // ancho de columna de día (px)
const NAME_COL = 140; // ancho de la columna de habitación (px)
const ROW_H = 44; // alto de fila (px)

const BAR_COLOR: Record<ReservationStatus, string> = {
  confirmed: 'bg-blue-500',
  checked_in: 'bg-emerald-600',
  checked_out: 'bg-slate-400',
  cancelled: 'bg-red-500',
  no_show: 'bg-orange-500',
};

export function TapeChart({
  rooms,
  reservations,
  start,
  days,
  today,
}: {
  rooms: TapeRoom[];
  reservations: TapeReservation[];
  start: string;
  days: number;
  today: string;
}) {
  const startDate = parseISO(start);
  const dayList = Array.from({ length: days }, (_, i) => addDays(startDate, i));
  const prevStart = format(addDays(startDate, -days), 'yyyy-MM-dd');
  const nextStart = format(addDays(startDate, days), 'yyyy-MM-dd');
  const timelineWidth = days * CELL;

  const byRoom = new Map<string, TapeReservation[]>();
  for (const r of reservations) {
    const arr = byRoom.get(r.room_id) ?? [];
    arr.push(r);
    byRoom.set(r.room_id, arr);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            {format(startDate, "d 'de' MMM", { locale: es })} –{' '}
            {format(addDays(startDate, days - 1), "d 'de' MMM yyyy", {
              locale: es,
            })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="icon-sm" aria-label="Anterior">
            <Link href={`?start=${prevStart}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar">Hoy</Link>
          </Button>
          <Button asChild variant="outline" size="icon-sm" aria-label="Siguiente">
            <Link href={`?start=${nextStart}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BedDouble className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              No hay habitaciones. Créalas en Configuración → Habitaciones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div style={{ width: NAME_COL + timelineWidth }}>
              {/* Cabecera de fechas */}
              <div className="flex border-b bg-muted/40">
                <div
                  className="sticky left-0 z-10 shrink-0 border-r bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
                  style={{ width: NAME_COL }}
                >
                  Habitación
                </div>
                {dayList.map((d) => {
                  const iso = format(d, 'yyyy-MM-dd');
                  const isToday = iso === today;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={iso}
                      className={cn(
                        'shrink-0 border-r py-1 text-center',
                        isWeekend && 'bg-muted/60',
                        isToday && 'bg-primary/10',
                      )}
                      style={{ width: CELL }}
                    >
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {format(d, 'EEE', { locale: es })}
                      </div>
                      <div
                        className={cn(
                          'text-sm font-medium',
                          isToday && 'text-primary',
                        )}
                      >
                        {format(d, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filas por habitación */}
              {rooms.map((room) => {
                const roomRes = byRoom.get(room.id) ?? [];
                return (
                  <div key={room.id} className="flex border-b last:border-b-0">
                    <div
                      className="sticky left-0 z-10 shrink-0 border-r bg-card px-3 py-2"
                      style={{ width: NAME_COL, height: ROW_H }}
                    >
                      <p className="truncate text-sm font-medium leading-tight">
                        {room.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {room.room_type?.name ?? ''}
                      </p>
                    </div>

                    <div
                      className="relative shrink-0"
                      style={{ width: timelineWidth, height: ROW_H }}
                    >
                      {/* Líneas de día */}
                      <div className="absolute inset-0 flex">
                        {dayList.map((d) => {
                          const iso = format(d, 'yyyy-MM-dd');
                          const isToday = iso === today;
                          const isWeekend =
                            d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <div
                              key={iso}
                              className={cn(
                                'h-full shrink-0 border-r',
                                isWeekend && 'bg-muted/30',
                                isToday && 'bg-primary/5',
                              )}
                              style={{ width: CELL }}
                            />
                          );
                        })}
                      </div>

                      {/* Barras de reserva */}
                      {roomRes.map((r) => {
                        const startOffset = Math.max(
                          0,
                          differenceInCalendarDays(
                            parseISO(r.check_in),
                            startDate,
                          ),
                        );
                        const endOffset = Math.min(
                          days,
                          differenceInCalendarDays(
                            parseISO(r.check_out),
                            startDate,
                          ),
                        );
                        const span = endOffset - startOffset;
                        if (span <= 0) return null;
                        return (
                          <div
                            key={r.id}
                            title={`${r.guest} · ${r.check_in} → ${r.check_out}`}
                            className={cn(
                              'absolute top-1.5 bottom-1.5 flex items-center overflow-hidden rounded-md px-2 text-xs font-medium text-white',
                              BAR_COLOR[r.status],
                            )}
                            style={{
                              left: startOffset * CELL + 2,
                              width: span * CELL - 4,
                            }}
                          >
                            <span className="truncate">{r.guest}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Vista de solo lectura. Crea o edita reservas desde{' '}
        <Link href="/reservations" className="underline">
          Reservas
        </Link>
        .
      </p>
    </div>
  );
}
