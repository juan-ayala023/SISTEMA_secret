import { z } from 'zod';

export const CHANNELS = ['airbnb', 'booking'] as const;

export const channelSchema = z.object({
  room_type_id: z.uuid('Selecciona un tipo de habitación'),
  channel: z.enum(CHANNELS),
  ical_import_url: z.url('URL inválida').or(z.literal('')).optional(),
});

export type ChannelInput = z.infer<typeof channelSchema>;
