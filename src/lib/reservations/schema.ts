import { z } from 'zod';

export const RESERVATION_STATUSES = [
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;

export const RESERVATION_SOURCES = [
  'direct',
  'airbnb',
  'booking',
  'walk_in',
  'whatsapp',
] as const;

export const reservationSchema = z
  .object({
    // Huésped: o se elige uno existente (guest_id) o se crea en línea.
    guest_id: z.uuid().optional().or(z.literal('')),
    create_new_guest: z.boolean().default(false),
    new_guest_first_name: z.string().trim().max(80).optional().or(z.literal('')),
    new_guest_last_name: z.string().trim().max(80).optional().or(z.literal('')),
    new_guest_phone: z.string().trim().max(30).optional().or(z.literal('')),

    room_type_id: z.uuid('Selecciona un tipo de habitación'),
    room_id: z.uuid().optional().or(z.literal('')),
    check_in: z.string().min(1, 'Fecha de entrada requerida'),
    check_out: z.string().min(1, 'Fecha de salida requerida'),
    adults: z.coerce.number().int().min(1, 'Mínimo 1').max(20),
    children: z.coerce.number().int().min(0).max(20),
    source: z.enum(RESERVATION_SOURCES),
    status: z.enum(RESERVATION_STATUSES),
    total_amount: z.coerce
      .number()
      .min(0, 'No puede ser negativo')
      .max(1_000_000_000),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((d) => d.check_out > d.check_in, {
    message: 'La salida debe ser posterior a la entrada',
    path: ['check_out'],
  })
  .refine(
    (d) =>
      !d.create_new_guest ||
      (d.new_guest_first_name?.trim().length ?? 0) > 0,
    {
      message: 'Nombre del nuevo huésped requerido',
      path: ['new_guest_first_name'],
    },
  );

export type ReservationInput = z.output<typeof reservationSchema>;
export type ReservationFormValues = z.input<typeof reservationSchema>;
