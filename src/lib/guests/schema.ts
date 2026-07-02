import { z } from 'zod';

// Esquema de huésped, compartido por cliente (react-hook-form) y servidor
// (Server Actions). Sin coerción → el tipo de entrada y salida coinciden.
export const guestSchema = z.object({
  first_name: z.string().trim().min(1, 'Nombre requerido').max(80),
  last_name: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.email('Correo inválido').or(z.literal('')).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  document_id: z.string().trim().max(40).optional().or(z.literal('')),
  nationality: z.string().trim().max(60).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type GuestInput = z.infer<typeof guestSchema>;
