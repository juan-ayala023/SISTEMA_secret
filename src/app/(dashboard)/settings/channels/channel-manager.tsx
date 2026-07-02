'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Cable,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  createChannel,
  deleteChannel,
  syncChannel,
  updateChannel,
} from '@/lib/channels/actions';
import { CHANNELS, channelSchema, type ChannelInput } from '@/lib/channels/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChannelConnection } from '@/types/database';

export type ChannelRoomType = { id: string; name: string };
export type ChannelRow = ChannelConnection & {
  room_type: { name: string } | null;
};

const CHANNEL_LABELS: Record<(typeof CHANNELS)[number], string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
};

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function ChannelManager({
  connections,
  roomTypes,
}: {
  connections: ChannelRow[];
  roomTypes: ChannelRoomType[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ChannelRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ChannelRow | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const empty: ChannelInput = {
    room_type_id: roomTypes[0]?.id ?? '',
    channel: 'airbnb',
    ical_import_url: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChannelInput>({
    resolver: zodResolver(channelSchema),
    defaultValues: empty,
  });

  function openCreate() {
    setEditing(null);
    reset(empty);
    setFormOpen(true);
  }

  function openEdit(c: ChannelRow) {
    setEditing(c);
    reset({
      room_type_id: c.room_type_id,
      channel: c.channel,
      ical_import_url: c.ical_import_url ?? '',
    });
    setFormOpen(true);
  }

  function onSubmit(values: ChannelInput) {
    startTransition(async () => {
      const res = editing
        ? await updateChannel(editing.id, values)
        : await createChannel(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(editing ? 'Conexión actualizada' : 'Conexión creada');
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteChannel(deleting.id);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Conexión eliminada');
      setDeleting(null);
      router.refresh();
    });
  }

  function sync(c: ChannelRow) {
    setSyncingId(c.id);
    startTransition(async () => {
      const res = await syncChannel(c.id);
      setSyncingId(null);
      if (!res.ok) {
        toast.error('No se pudo sincronizar', { description: res.error });
        return;
      }
      toast.success('Sincronización completa', {
        description: `${res.imported} importadas · ${res.updated} actualizadas · ${res.ignored} ignoradas`,
      });
      router.refresh();
    });
  }

  const noTypes = roomTypes.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Configuración
          </Link>
          <h1 className="text-2xl font-semibold">Conexiones de canal</h1>
          <p className="text-sm text-muted-foreground">
            URLs iCal de Airbnb / Booking por tipo de habitación.
          </p>
        </div>
        <Button onClick={openCreate} disabled={noTypes}>
          <Plus className="size-4" />
          Nueva conexión
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <Cable className="mt-0.5 size-4 shrink-0" />
        <p>
          Aquí guardas las URLs de importación iCal. La sincronización
          automática (importar/exportar disponibilidad) se conectará en una fase
          posterior; por ahora es el registro de las conexiones.
        </p>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Cable className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              {noTypes
                ? 'Primero crea tipos de habitación para conectar canales.'
                : 'Aún no hay conexiones de canal.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {CHANNEL_LABELS[c.channel]} ·{' '}
                    <span className="text-muted-foreground">
                      {c.room_type?.name ?? 'Sin tipo'}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.ical_import_url || 'Sin URL'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.last_synced_at
                      ? `Sincronizado: ${format(
                          parseISO(c.last_synced_at),
                          "d MMM yyyy, HH:mm",
                          { locale: es },
                        )}`
                      : 'Nunca sincronizado'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!c.ical_import_url || syncingId === c.id}
                    onClick={() => sync(c)}
                  >
                    {syncingId === c.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Sincronizar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(c)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(c)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Crear / editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar conexión' : 'Nueva conexión'}
            </DialogTitle>
            <DialogDescription>
              Vincula un canal externo a un tipo de habitación.
            </DialogDescription>
          </DialogHeader>

          <form
            id="channel-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="channel">Canal</Label>
                <select
                  id="channel"
                  className={selectClass}
                  {...register('channel')}
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
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
                {errors.room_type_id && (
                  <p className="text-sm text-destructive">
                    {errors.room_type_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ical_import_url">URL iCal de importación</Label>
              <Input
                id="ical_import_url"
                placeholder="https://www.airbnb.com/calendar/ical/…"
                {...register('ical_import_url')}
              />
              {errors.ical_import_url && (
                <p className="text-sm text-destructive">
                  {errors.ical_import_url.message}
                </p>
              )}
            </div>
          </form>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" form="channel-form" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar conexión</DialogTitle>
            <DialogDescription>
              ¿Eliminar esta conexión de canal? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
