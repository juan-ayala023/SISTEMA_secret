'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  DoorOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { createRoom, deleteRoom, updateRoom } from '@/lib/inventory/actions';
import { roomSchema, ROOM_STATUSES, type RoomInput } from '@/lib/inventory/schema';
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
import type { Room, RoomStatus } from '@/types/database';

export type RoomRow = Room & { room_type: { name: string } | null };
type RoomTypeOption = { id: string; name: string };

const STATUS_META: Record<RoomStatus, { label: string; className: string }> = {
  clean: { label: 'Limpia', className: 'bg-emerald-100 text-emerald-700' },
  dirty: { label: 'Sucia', className: 'bg-orange-100 text-orange-700' },
  inspected: { label: 'Inspeccionada', className: 'bg-blue-100 text-blue-700' },
  out_of_order: {
    label: 'Fuera de servicio',
    className: 'bg-red-100 text-red-700',
  },
};

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function RoomManager({
  rooms,
  roomTypes,
}: {
  rooms: RoomRow[];
  roomTypes: RoomTypeOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<RoomRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const emptyRoom: RoomInput = {
    name: '',
    room_type_id: roomTypes[0]?.id ?? '',
    floor: '',
    status: 'clean',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: emptyRoom,
  });

  function openCreate() {
    setEditing(null);
    reset(emptyRoom);
    setFormOpen(true);
  }

  function openEdit(room: RoomRow) {
    setEditing(room);
    reset({
      name: room.name,
      room_type_id: room.room_type_id,
      floor: room.floor ?? '',
      status: room.status,
    });
    setFormOpen(true);
  }

  function onSubmit(values: RoomInput) {
    startTransition(async () => {
      const res = editing
        ? await updateRoom(editing.id, values)
        : await createRoom(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(editing ? 'Habitación actualizada' : 'Habitación creada');
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteRoom(deleting.id);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Habitación eliminada');
      setDeleting(null);
      router.refresh();
    });
  }

  const noTypes = roomTypes.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/settings"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Configuración
          </Link>
          <h1 className="text-2xl font-semibold">Habitaciones</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.length} {rooms.length === 1 ? 'habitación' : 'habitaciones'}{' '}
            en tu propiedad.
          </p>
        </div>
        <Button onClick={openCreate} disabled={noTypes}>
          <Plus className="size-4" />
          Nueva habitación
        </Button>
      </div>

      {noTypes ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <DoorOpen className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Primero crea al menos un tipo de habitación: cada habitación debe
              pertenecer a uno.
            </p>
            <Button asChild variant="outline">
              <Link href="/settings/room-types">Ir a tipos de habitación</Link>
            </Button>
          </CardContent>
        </Card>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <DoorOpen className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Aún no hay habitaciones. Crea la primera unidad física.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="size-4" />
              Crear habitación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {rooms.map((room) => {
              const meta = STATUS_META[room.status];
              return (
                <li key={room.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{room.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {room.room_type?.name ?? 'Sin tipo'}
                      {room.floor ? ` · Piso ${room.floor}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(room)}
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleting(room)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Crear / editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar habitación' : 'Nueva habitación'}
            </DialogTitle>
            <DialogDescription>
              Unidad física asignable a reservas.
            </DialogDescription>
          </DialogHeader>

          <form
            id="room-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="room-name">Nombre / número</Label>
              <Input id="room-name" placeholder="101" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="floor">Piso (opcional)</Label>
                <Input id="floor" placeholder="1" {...register('floor')} />
                {errors.floor && (
                  <p className="text-sm text-destructive">
                    {errors.floor.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  className={selectClass}
                  {...register('status')}
                >
                  {ROOM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" form="room-form" disabled={isPending}>
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
            <DialogTitle>Eliminar habitación</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleting?.name}</strong>? Esta acción no se
              puede deshacer.
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
