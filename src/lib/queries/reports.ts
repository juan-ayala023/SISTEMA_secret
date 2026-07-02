import { createClient } from '@/lib/supabase/server';
import { nightsBetween } from '@/lib/utils/dates';
import type { ReservationSource, ReservationStatus } from '@/types/database';

export interface ReportData {
  from: string;
  to: string;
  total: number;
  active: number; // reservas no canceladas / no-show
  revenue: number;
  nightsSold: number;
  adr: number;
  byStatus: Record<ReservationStatus, number>;
  bySource: Record<ReservationSource, number>;
}

const EMPTY_STATUS: Record<ReservationStatus, number> = {
  confirmed: 0,
  checked_in: 0,
  checked_out: 0,
  cancelled: 0,
  no_show: 0,
};

const EMPTY_SOURCE: Record<ReservationSource, number> = {
  direct: 0,
  airbnb: 0,
  booking: 0,
  walk_in: 0,
  whatsapp: 0,
};

// Reporte del periodo, contando reservas por su fecha de entrada (check_in).
export async function getReport(
  propertyId: string,
  from: string,
  to: string,
): Promise<ReportData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reservations')
    .select('status, source, check_in, check_out, total_amount')
    .eq('property_id', propertyId)
    .gte('check_in', from)
    .lte('check_in', to);

  const rows = (data ?? []) as {
    status: ReservationStatus;
    source: ReservationSource;
    check_in: string;
    check_out: string;
    total_amount: number;
  }[];

  const byStatus = { ...EMPTY_STATUS };
  const bySource = { ...EMPTY_SOURCE };
  let revenue = 0;
  let nightsSold = 0;
  let active = 0;

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    const counts = r.status !== 'cancelled' && r.status !== 'no_show';
    if (counts) {
      active += 1;
      revenue += r.total_amount ?? 0;
      nightsSold += nightsBetween(r.check_in, r.check_out);
    }
  }

  return {
    from,
    to,
    total: rows.length,
    active,
    revenue,
    nightsSold,
    adr: nightsSold > 0 ? revenue / nightsSold : 0,
    byStatus,
    bySource,
  };
}
