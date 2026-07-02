'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BedDouble,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createRoomType,
  deleteRoomType,
  updateRoomType,
} from '@/lib/inventory/actions';
import {
  roomTypeSchema,
  type RoomTypeFormValues,
  type RoomTypeInput,
} from '@/lib/inventory/schema';
import { formatCOP } from '@/lib/utils/currency';
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
import type { RoomType } from '@/types/database';

const EMPTY: RoomTypeInput = {
  name: '',
  description: '',
  base_occupancy: 2,
  max_occupancy: 2,
  base_rate: 0,
};

export function RoomTypeManager({ items }: { items: RoomType[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<RoomType | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomTypeFormValues, unknown, RoomTypeInput>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: EMPTY,
  });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(rt: RoomType) {
    setEditing(rt);
    reset({
      name: rt.name,
      description: rt.description ?? '',
      base_occupancy: rt.base_occupancy,
      max_occupancy: rt.max_occupancy,
      base_rate: rt.base_rate,
    });
    setFormOpen(true);
  }

  function onSubmit(values: RoomTypeInput) {
    startTransition(async () => {
      const res = editing
        ? await updateRoomType(editing.id, values)
        : await createRoomType(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(editing ? 'Tipo actualizado' : 'Tipo creado');
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteRoomType(deleting.id);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Tipo eliminado');
      setDeleting(null);
      router.refresh();
    });
  }

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
          <h1 className="text-2xl font-semibold">Tipos de habitación</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'tipo' : 'tipos'} en tu
            propiedad.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo tipo
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BedDouble className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Aún no hay tipos de habitación. Crea el primero para poder añadir
              habitaciones y, más adelante, reservas.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="size-4" />
              Crear tipo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {items.map((rt) => (
              <li
                key={rt.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{rt.name}</p>
                  {rt.description && (
                    <p className="truncate text-sm text-muted-foreground">
                      {rt.description}
                    </p>
                  )}
                </div>
                <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
                  <Users className="size-3.5" />
                  {rt.base_occupancy}–{rt.max_occupancy}
                </span>
                <span className="w-28 text-right text-sm font-medium">
                  {formatCOP(rt.base_rate)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(rt)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(rt)}
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
              {editing ? 'Editar tipo' : 'Nuevo tipo de habitación'}
            </DialogTitle>
            <DialogDescription>
              Categoría de habitación con su ocupación y tarifa base.
            </DialogDescription>
          </DialogHeader>

          <form
            id="room-type-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Suite deluxe" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <textarea
                id="description"
                rows={2}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Suite con jacuzzi y vista"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="base_occupancy">Ocupación base</Label>
                <Input
                  id="base_occupancy"
                  type="number"
                  min={1}
                  {...register('base_occupancy')}
                />
                {errors.base_occupancy && (
                  <p className="text-sm text-destructive">
                    {errors.base_occupancy.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_occupancy">Ocupación máxima</Label>
                <Input
                  id="max_occupancy"
                  type="number"
                  min={1}
                  {...register('max_occupancy')}
                />
                {errors.max_occupancy && (
                  <p className="text-sm text-destructive">
                    {errors.max_occupancy.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_rate">Tarifa base (COP)</Label>
              <Input
                id="base_rate"
                type="number"
                min={0}
                step={1000}
                {...register('base_rate')}
              />
              {errors.base_rate && (
                <p className="text-sm text-destructive">
                  {errors.base_rate.message}
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
            <Button type="submit" form="room-type-form" disabled={isPending}>
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
            <DialogTitle>Eliminar tipo</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleting?.name}</strong>? Las habitaciones de
              este tipo también se eliminarán. Esta acción no se puede deshacer.
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
