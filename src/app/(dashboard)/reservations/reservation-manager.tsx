'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  BedDouble,
  CalendarPlus,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import {
  createReservation,
  deleteReservation,
  setReservationStatus,
  updateReservation,
} from '@/lib/reservations/actions';
import {
  reservationSchema,
  RESERVATION_SOURCES,
  type ReservationFormValues,
  type ReservationInput,
} from '@/lib/reservations/schema';
import { formatCOP } from '@/lib/utils/currency';
import { formatDateRange, nightsBetween } from '@/lib/utils/dates';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Reservation, ReservationStatus } from '@/types/database';

export type RoomTypeOption = { id: string; name: string };
export type RoomOption = { id: string; name: string; room_type_id: string };
export type GuestOption = {
  id: string;
  first_name: string;
  last_name: string | null;
};
export type ReservationRow = Reservation & {
  guest: { id: string; first_name: string; last_name: string | null } | null;
  room: { name: string } | null;
  room_type: { name: string } | null;
};

const STATUS_META: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: 'En casa', className: 'bg-emerald-100 text-emerald-700' },
  checked_out: { label: 'Salida', className: 'bg-slate-200 text-slate-700' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  no_show: { label: 'No-show', className: 'bg-orange-100 text-orange-700' },
};

const SOURCE_LABELS: Record<(typeof RESERVATION_SOURCES)[number], string> = {
  direct: 'Directa',
  airbnb: 'Airbnb',
  booking: 'Booking',
  walk_in: 'Walk-in',
  whatsapp: 'WhatsApp',
};

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'checked_in', label: 'En casa' },
  { key: 'checked_out', label: 'Salidas' },
  { key: 'cancelled', label: 'Canceladas' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function guestName(g: GuestOption | ReservationRow['guest']) {
  if (!g) return 'Sin huésped';
  return [g.first_name, g.last_name].filter(Boolean).join(' ');
}

export function ReservationManager({
  reservations,
  roomTypes,
  rooms,
  guests,
}: {
  reservations: ReservationRow[];
  roomTypes: RoomTypeOption[];
  rooms: RoomOption[];
  guests: GuestOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [editing, setEditing] = useState<ReservationRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ReservationRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const emptyValues: ReservationFormValues = {
    guest_id: '',
    create_new_guest: false,
    new_guest_first_name: '',
    new_guest_last_name: '',
    new_guest_phone: '',
    room_type_id: roomTypes[0]?.id ?? '',
    room_id: '',
    check_in: isoDay(0),
    check_out: isoDay(1),
    adults: 2,
    children: 0,
    source: 'direct',
    status: 'confirmed',
    total_amount: 0,
    notes: '',
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReservationFormValues, unknown, ReservationInput>({
    resolver: zodResolver(reservationSchema),
    defaultValues: emptyValues,
  });

  const selectedType = watch('room_type_id');
  const createNewGuest = watch('create_new_guest');
  const availableRooms = useMemo(
    () => rooms.filter((r) => r.room_type_id === selectedType),
    [rooms, selectedType],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return reservations;
    if (filter === 'cancelled')
      return reservations.filter(
        (r) => r.status === 'cancelled' || r.status === 'no_show',
      );
    return reservations.filter((r) => r.status === filter);
  }, [reservations, filter]);

  const noTypes = roomTypes.length === 0;

  function openCreate() {
    setEditing(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEdit(r: ReservationRow) {
    setEditing(r);
    reset({
      guest_id: r.guest?.id ?? '',
      create_new_guest: false,
      new_guest_first_name: '',
      new_guest_last_name: '',
      new_guest_phone: '',
      room_type_id: r.room_type_id,
      room_id: r.room_id ?? '',
      check_in: r.check_in,
      check_out: r.check_out,
      adults: r.adults,
      children: r.children,
      source: r.source,
      status: r.status,
      total_amount: r.total_amount,
      notes: r.notes ?? '',
    });
    setFormOpen(true);
  }

  function onSubmit(values: ReservationInput) {
    startTransition(async () => {
      const res = editing
        ? await updateReservation(editing.id, values)
        : await createReservation(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(editing ? 'Reserva actualizada' : 'Reserva creada');
      setFormOpen(false);
      router.refresh();
    });
  }

  function changeStatus(r: ReservationRow, status: ReservationStatus) {
    startTransition(async () => {
      const res = await setReservationStatus(r.id, status);
      if (!res.ok) {
        toast.error('No se pudo actualizar', { description: res.error });
        return;
      }
      toast.success('Estado actualizado');
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteReservation(deleting.id);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Reserva eliminada');
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reservas</h1>
          <p className="text-sm text-muted-foreground">
            {reservations.length}{' '}
            {reservations.length === 1 ? 'reserva' : 'reservas'} en total.
          </p>
        </div>
        <Button onClick={openCreate} disabled={noTypes}>
          <Plus className="size-4" />
          Nueva reserva
        </Button>
      </div>

      {noTypes ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <BedDouble className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Primero crea tipos de habitación (y habitaciones) en Configuración
              para poder registrar reservas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros por estado */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <CalendarPlus className="size-7" />
                </div>
                <p className="max-w-sm text-sm">
                  {filter === 'all'
                    ? 'Aún no hay reservas. Crea la primera.'
                    : 'No hay reservas con este estado.'}
                </p>
                {filter === 'all' && (
                  <Button onClick={openCreate} variant="outline">
                    <Plus className="size-4" />
                    Nueva reserva
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-0">
              <ul className="divide-y">
                {filtered.map((r) => {
                  const meta = STATUS_META[r.status];
                  const nights = nightsBetween(r.check_in, r.check_out);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium">
                          {guestName(r.guest)}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {r.room_type?.name ?? 'Tipo'}
                          {r.room?.name
                            ? ` · Hab. ${r.room.name}`
                            : ' · sin asignar'}
                        </p>
                      </div>

                      <div className="text-sm">
                        <p className="font-medium">
                          {formatDateRange(r.check_in, r.check_out)}
                        </p>
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Moon className="size-3" />
                          {nights} {nights === 1 ? 'noche' : 'noches'}
                        </p>
                      </div>

                      <div className="w-28 text-right text-sm font-medium">
                        {formatCOP(r.total_amount)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {r.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => changeStatus(r, 'checked_in')}
                          >
                            <LogIn className="size-3.5" />
                            Check-in
                          </Button>
                        )}
                        {r.status === 'checked_in' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => changeStatus(r, 'checked_out')}
                          >
                            <LogOut className="size-3.5" />
                            Check-out
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Más acciones"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => openEdit(r), 0);
                              }}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                            {(r.status === 'confirmed' ||
                              r.status === 'checked_in') && (
                              <DropdownMenuItem
                                onClick={() => changeStatus(r, 'cancelled')}
                              >
                                <XCircle className="size-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            {r.status === 'confirmed' && (
                              <DropdownMenuItem
                                onClick={() => changeStatus(r, 'no_show')}
                              >
                                <User className="size-4" />
                                Marcar no-show
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={(e) => {
                                e.preventDefault();
                                setTimeout(() => setDeleting(r), 0);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* Crear / editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar reserva' : 'Nueva reserva'}
            </DialogTitle>
            <DialogDescription>
              Fechas, habitación y huésped de la estancia.
            </DialogDescription>
          </DialogHeader>

          <form
            id="reservation-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Huésped */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>Huésped</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" {...register('create_new_guest')} />
                  Crear nuevo
                </label>
              </div>

              {createNewGuest ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        placeholder="Nombre"
                        {...register('new_guest_first_name')}
                      />
                      {errors.new_guest_first_name && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.new_guest_first_name.message}
                        </p>
                      )}
                    </div>
                    <Input
                      placeholder="Apellido"
                      {...register('new_guest_last_name')}
                    />
                  </div>
                  <Input
                    placeholder="Teléfono (opcional)"
                    {...register('new_guest_phone')}
                  />
                </div>
              ) : (
                <select className={selectClass} {...register('guest_id')}>
                  <option value="">— Sin huésped —</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>
                      {guestName(g)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Habitación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="room_type_id">Tipo</Label>
                <select
                  id="room_type_id"
                  className={selectClass}
                  {...register('room_type_id', {
                    onChange: () => setValue('room_id', ''),
                  })}
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
              <div className="space-y-2">
                <Label htmlFor="room_id">Habitación</Label>
                <select
                  id="room_id"
                  className={selectClass}
                  {...register('room_id')}
                >
                  <option value="">— Sin asignar —</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="check_in">Entrada</Label>
                <Input id="check_in" type="date" {...register('check_in')} />
                {errors.check_in && (
                  <p className="text-sm text-destructive">
                    {errors.check_in.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out">Salida</Label>
                <Input id="check_out" type="date" {...register('check_out')} />
                {errors.check_out && (
                  <p className="text-sm text-destructive">
                    {errors.check_out.message}
                  </p>
                )}
              </div>
            </div>

            {/* Ocupación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="adults">Adultos</Label>
                <Input
                  id="adults"
                  type="number"
                  min={1}
                  {...register('adults')}
                />
                {errors.adults && (
                  <p className="text-sm text-destructive">
                    {errors.adults.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="children">Niños</Label>
                <Input
                  id="children"
                  type="number"
                  min={0}
                  {...register('children')}
                />
              </div>
            </div>

            {/* Origen / estado / total */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Origen</Label>
                <select
                  id="source"
                  className={selectClass}
                  {...register('source')}
                >
                  {RESERVATION_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total (COP)</Label>
                <Input
                  id="total_amount"
                  type="number"
                  min={0}
                  step={1000}
                  {...register('total_amount')}
                />
                {errors.total_amount && (
                  <p className="text-sm text-destructive">
                    {errors.total_amount.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea
                id="notes"
                rows={2}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register('notes')}
              />
            </div>
          </form>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" form="reservation-form" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Guardar' : 'Crear reserva'}
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
            <DialogTitle>Eliminar reserva</DialogTitle>
            <DialogDescription>
              ¿Eliminar la reserva de{' '}
              <strong>{deleting ? guestName(deleting.guest) : ''}</strong>? Esta
              acción no se puede deshacer. Considera “Cancelar” si prefieres
              conservar el registro.
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
