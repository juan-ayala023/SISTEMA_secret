import { z } from 'zod';

// Esquemas compartidos entre el cliente (react-hook-form) y el servidor
// (Server Actions). No lleva 'use server' para poder importarse en ambos.

export const roomTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Nombre requerido').max(80),
    description: z.string().trim().max(300).optional().or(z.literal('')),
    base_occupancy: z.coerce
      .number()
      .int('Debe ser un entero')
      .min(1, 'Mínimo 1')
      .max(20, 'Máximo 20'),
    max_occupancy: z.coerce
      .number()
      .int('Debe ser un entero')
      .min(1, 'Mínimo 1')
      .max(20, 'Máximo 20'),
    base_rate: z.coerce
      .number()
      .min(0, 'No puede ser negativo')
      .max(100_000_000, 'Valor demasiado alto'),
  })
  .refine((d) => d.max_occupancy >= d.base_occupancy, {
    message: 'La ocupación máxima debe ser ≥ la base',
    path: ['max_occupancy'],
  });

// Salida (tras coerción): números ya convertidos — lo que reciben las actions.
export type RoomTypeInput = z.output<typeof roomTypeSchema>;
// Entrada del formulario (antes de coerción): react-hook-form la usa como
// tipo de campos, porque `z.coerce.number()` acepta `unknown` de los inputs.
export type RoomTypeFormValues = z.input<typeof roomTypeSchema>;

export const ROOM_STATUSES = [
  'clean',
  'dirty',
  'inspected',
  'out_of_order',
] as const;

export const roomSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(40),
  room_type_id: z.uuid('Selecciona un tipo de habitación'),
  floor: z.string().trim().max(20).optional().or(z.literal('')),
  status: z.enum(ROOM_STATUSES),
});

export type RoomInput = z.infer<typeof roomSchema>;
