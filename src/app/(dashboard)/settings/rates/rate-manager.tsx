'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ArrowLeft, CalendarRange, Loader2, Trash2 } from 'lucide-react';
import { deleteRate, upsertRates } from '@/lib/rates/actions';
import {
  rateBulkSchema,
  type RateBulkFormValues,
  type RateBulkInput,
} from '@/lib/rates/schema';
import { formatCOP } from '@/lib/utils/currency';
import { todayInTZ } from '@/lib/utils/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type RateRoomType = { id: string; name: string; base_rate: number };
export type RateRow = {
  id: string;
  room_type_id: string;
  date: string;
  price: number;
  min_stay: number;
  closed: boolean;
};

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function RateManager({
  roomTypes,
  rates,
}: {
  roomTypes: RateRoomType[];
  rates: RateRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const today = todayInTZ();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RateBulkFormValues, unknown, RateBulkInput>({
    resolver: zodResolver(rateBulkSchema),
    defaultValues: {
      room_type_id: roomTypes[0]?.id ?? '',
      from: today,
      to: today,
      price: roomTypes[0]?.base_rate ?? 0,
      min_stay: 1,
      closed: false,
    },
  });

  const selectedType = watch('room_type_id');
  const typeRates = useMemo(
    () => rates.filter((r) => r.room_type_id === selectedType),
    [rates, selectedType],
  );
  const selectedBase = roomTypes.find((t) => t.id === selectedType)?.base_rate;

  function onSubmit(values: RateBulkInput) {
    startTransition(async () => {
      const res = await upsertRates(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(`Tarifas actualizadas (${res.count} días)`);
      router.refresh();
    });
  }

  function remove(id: string) {
    setPendingDelete(id);
    startTransition(async () => {
      const res = await deleteRate(id);
      setPendingDelete(null);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Tarifa eliminada');
      router.refresh();
    });
  }

  if (roomTypes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <CalendarRange className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Primero crea tipos de habitación para poder fijar tarifas.
            </p>
            <Button asChild variant="outline">
              <Link href="/settings/room-types">Ir a tipos de habitación</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Header />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fijar tarifa por rango</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_type_id">Tipo de habitación</Label>
              <select
                id="room_type_id"
                className={selectClass}
                {...register('room_type_id')}
              >
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selectedBase != null && (
                <p className="text-xs text-muted-foreground">
                  Tarifa base: {formatCOP(selectedBase)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="from">Desde</Label>
                <Input id="from" type="date" {...register('from')} />
                {errors.from && (
                  <p className="text-sm text-destructive">
                    {errors.from.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Hasta</Label>
                <Input id="to" type="date" {...register('to')} />
                {errors.to && (
                  <p className="text-sm text-destructive">{errors.to.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Precio / noche (COP)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={1000}
                  {...register('price')}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stay">Estancia mínima</Label>
                <Input
                  id="min_stay"
                  type="number"
                  min={1}
                  {...register('min_stay')}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('closed')} />
              Cerrar disponibilidad en este rango
            </label>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Aplicar tarifas
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tarifas fijadas próximas */}
      <Card className="p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Tarifas fijadas (próximas)</p>
        </div>
        {typeRates.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sin tarifas específicas para este tipo. Se usa la tarifa base.
          </div>
        ) : (
          <ul className="divide-y">
            {typeRates.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-4 py-2.5">
                <span className="w-32 text-sm">
                  {format(parseISO(r.date), "EEE d MMM", { locale: es })}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {formatCOP(r.price)}
                </span>
                <span className="text-xs text-muted-foreground">
                  mín. {r.min_stay} {r.min_stay === 1 ? 'noche' : 'noches'}
                </span>
                {r.closed && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Cerrado
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendingDelete === r.id}
                  onClick={() => remove(r.id)}
                  aria-label="Eliminar"
                >
                  {pendingDelete === r.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 text-destructive" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div>
      <Link
        href="/settings"
        className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" />
        Configuración
      </Link>
      <h1 className="text-2xl font-semibold">Calendario de tarifas</h1>
      <p className="text-sm text-muted-foreground">
        Precios por noche y estancia mínima por tipo de habitación.
      </p>
    </div>
  );
}
