import { z } from 'zod';

// Fijado masivo de tarifas para un tipo de habitación en un rango de fechas.
export const rateBulkSchema = z
  .object({
    room_type_id: z.uuid('Selecciona un tipo de habitación'),
    from: z.string().min(1, 'Fecha requerida'),
    to: z.string().min(1, 'Fecha requerida'),
    price: z.coerce.number().min(0, 'No puede ser negativo').max(100_000_000),
    min_stay: z.coerce.number().int().min(1, 'Mínimo 1').max(60),
    closed: z.boolean().default(false),
  })
  .refine((d) => d.to >= d.from, {
    message: 'La fecha final debe ser ≥ la inicial',
    path: ['to'],
  });

export type RateBulkInput = z.output<typeof rateBulkSchema>;
export type RateBulkFormValues = z.input<typeof rateBulkSchema>;
