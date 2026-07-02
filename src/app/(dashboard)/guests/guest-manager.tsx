'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  IdCard,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { createGuest, deleteGuest, updateGuest } from '@/lib/guests/actions';
import { guestSchema, type GuestInput } from '@/lib/guests/schema';
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
import type { Guest } from '@/types/database';

const EMPTY: GuestInput = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  document_id: '',
  nationality: '',
  notes: '',
};

function fullName(g: Guest) {
  return [g.first_name, g.last_name].filter(Boolean).join(' ');
}

function initials(g: Guest) {
  return [g.first_name?.[0], g.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

export function GuestManager({ items }: { items: Guest[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Guest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Guest | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: EMPTY,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((g) =>
      [g.first_name, g.last_name, g.email, g.phone, g.document_id]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [items, query]);

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setFormOpen(true);
  }

  function openEdit(g: Guest) {
    setEditing(g);
    reset({
      first_name: g.first_name,
      last_name: g.last_name ?? '',
      email: g.email ?? '',
      phone: g.phone ?? '',
      document_id: g.document_id ?? '',
      nationality: g.nationality ?? '',
      notes: g.notes ?? '',
    });
    setFormOpen(true);
  }

  function onSubmit(values: GuestInput) {
    startTransition(async () => {
      const res = editing
        ? await updateGuest(editing.id, values)
        : await createGuest(values);
      if (!res.ok) {
        toast.error('No se pudo guardar', { description: res.error });
        return;
      }
      toast.success(editing ? 'Huésped actualizado' : 'Huésped creado');
      setFormOpen(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteGuest(deleting.id);
      if (!res.ok) {
        toast.error('No se pudo eliminar', { description: res.error });
        return;
      }
      toast.success('Huésped eliminado');
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Huéspedes</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'huésped' : 'huéspedes'} en tu
            propiedad.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo huésped
        </Button>
      </div>

      {items.length > 0 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o documento…"
            className="h-9 pl-8"
          />
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="size-7" />
            </div>
            <p className="max-w-sm text-sm">
              Aún no hay huéspedes. Créalos aquí o se irán creando al registrar
              reservas.
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="size-4" />
              Crear huésped
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sin resultados para “{query}”.
          </CardContent>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {filtered.map((g) => (
              <li key={g.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {initials(g) || <Users className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{fullName(g)}</p>
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                    {g.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {g.email}
                      </span>
                    )}
                    {g.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {g.phone}
                      </span>
                    )}
                    {g.document_id && (
                      <span className="inline-flex items-center gap-1">
                        <IdCard className="size-3" />
                        {g.document_id}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(g)}
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(g)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar huésped' : 'Nuevo huésped'}
            </DialogTitle>
            <DialogDescription>
              Solo el nombre es obligatorio; el resto es opcional.
            </DialogDescription>
          </DialogHeader>

          <form
            id="guest-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input id="first_name" {...register('first_name')} />
                {errors.first_name && (
                  <p className="text-sm text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input id="last_name" {...register('last_name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...register('phone')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="document_id">Documento</Label>
                <Input id="document_id" {...register('document_id')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nacionalidad</Label>
                <Input id="nationality" {...register('nationality')} />
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
            <Button type="submit" form="guest-form" disabled={isPending}>
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
            <DialogTitle>Eliminar huésped</DialogTitle>
            <DialogDescription>
              ¿Eliminar a <strong>{deleting ? fullName(deleting) : ''}</strong>?
              Sus reservas quedarán sin huésped asociado. Esta acción no se puede
              deshacer.
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
