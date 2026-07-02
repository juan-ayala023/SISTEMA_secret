// Parser mínimo de iCalendar (RFC 5545) enfocado en los VEVENT que exportan
// Airbnb y Booking: DTSTART, DTEND y UID. Las fechas se devuelven como
// yyyy-MM-dd (los canales usan VALUE=DATE, y DTEND es exclusivo = día de salida,
// que coincide con nuestro modelo de check_out).

export interface IcalEvent {
  uid: string;
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd (exclusivo → check_out)
  summary: string;
}

// Desdobla líneas plegadas (una nueva línea seguida de espacio/tab es
// continuación de la anterior) y separa en líneas lógicas.
function unfold(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n');
}

// Extrae la fecha de un valor DTSTART/DTEND (soporta DATE y DATE-TIME).
function icalDate(value: string): string | null {
  const m = value.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

export function parseIcal(text: string): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;

    const rawName = line.slice(0, idx);
    const value = line.slice(idx + 1);
    // El nombre puede traer parámetros: "DTSTART;VALUE=DATE".
    const name = rawName.split(';')[0].trim().toUpperCase();

    if (name === 'BEGIN' && value.trim().toUpperCase() === 'VEVENT') {
      cur = {};
      continue;
    }
    if (name === 'END' && value.trim().toUpperCase() === 'VEVENT') {
      if (cur) {
        events.push({
          uid: cur.uid ?? '',
          start: cur.start ?? '',
          end: cur.end ?? '',
          summary: cur.summary ?? '',
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    if (name === 'UID') cur.uid = value.trim();
    else if (name === 'DTSTART') cur.start = icalDate(value) ?? '';
    else if (name === 'DTEND') cur.end = icalDate(value) ?? '';
    else if (name === 'SUMMARY') cur.summary = unescapeText(value.trim());
  }

  return events;
}
