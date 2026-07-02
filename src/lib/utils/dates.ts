import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Fecha "de hoy" (yyyy-MM-dd) en la zona horaria de la propiedad.
// Las noches de hotel se manejan como fechas puras, sin hora.
export function todayInTZ(timeZone = 'America/Bogota'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA => yyyy-MM-dd
}

// Rango de fechas legible, p. ej. "2 jul → 5 jul 2026".
export function formatDateRange(checkIn: string, checkOut: string): string {
  const ci = parseISO(checkIn);
  const co = parseISO(checkOut);
  return `${format(ci, 'd MMM', { locale: es })} → ${format(co, 'd MMM yyyy', {
    locale: es,
  })}`;
}

// Noches entre entrada y salida (fechas puras).
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));
}
