import { createClient } from '@/lib/supabase/server';
import { todayInTZ } from '@/lib/utils/dates';
import { occupancyRate, adr, revpar } from '@/lib/utils/kpi';
import type { RoomStatus } from '@/types/database';

export interface DashboardData {
  today: string;
  arrivals: number;
  departures: number;
  inHouse: number;
  totalRooms: number;
  occupiedRooms: number;
  occupancy: number;
  adr: number;
  revpar: number;
  housekeeping: Record<RoomStatus, number>;
  ready: boolean; // false si Supabase no está configurado / falló la consulta
}

const EMPTY_HK: Record<RoomStatus, number> = {
  clean: 0,
  dirty: 0,
  inspected: 0,
  out_of_order: 0,
};

// Reúne los datos del día para el dashboard de recepción.
// Resiliente: si Supabase no responde (placeholders), devuelve ceros con ready=false.
export async function getDashboardData(
  propertyId: string,
  timezone: string,
): Promise<DashboardData> {
  const today = todayInTZ(timezone);

  const empty: DashboardData = {
    today,
    arrivals: 0,
    departures: 0,
    inHouse: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    occupancy: 0,
    adr: 0,
    revpar: 0,
    housekeeping: { ...EMPTY_HK },
    ready: false,
  };

  try {
    const supabase = await createClient();

    const [
      arrivalsRes,
      departuresRes,
      inHouseRes,
      roomsRes,
      stayingRes,
    ] = await Promise.all([
      // Llegadas de hoy (confirmadas con check_in = hoy)
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('status', 'confirmed')
        .eq('check_in', today),
      // Salidas de hoy (check_out = hoy, aún en casa)
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('status', 'checked_in')
        .eq('check_out', today),
      // En casa ahora mismo
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('status', 'checked_in'),
      // Todas las habitaciones (para ocupación y housekeeping)
      supabase.from('rooms').select('status').eq('property_id', propertyId),
      // Reservas que ocupan la noche de hoy (check_in <= hoy < check_out)
      supabase
        .from('reservations')
        .select('total_amount, check_in, check_out')
        .eq('property_id', propertyId)
        .in('status', ['checked_in', 'confirmed'])
        .lte('check_in', today)
        .gt('check_out', today),
    ]);

    const rooms = roomsRes.data ?? [];
    const totalRooms = rooms.length;

    const housekeeping = { ...EMPTY_HK };
    for (const r of rooms) {
      const s = r.status as RoomStatus;
      if (s in housekeeping) housekeeping[s] += 1;
    }

    const staying = stayingRes.data ?? [];
    const occupiedRooms = staying.length;

    // Ingresos por alojamiento del día ≈ total_amount / nº de noches de la estancia.
    let roomRevenue = 0;
    for (const r of staying) {
      const nights = Math.max(
        1,
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) /
          86_400_000,
      );
      roomRevenue += (r.total_amount ?? 0) / nights;
    }

    return {
      today,
      arrivals: arrivalsRes.count ?? 0,
      departures: departuresRes.count ?? 0,
      inHouse: inHouseRes.count ?? 0,
      totalRooms,
      occupiedRooms,
      occupancy: occupancyRate(occupiedRooms, totalRooms),
      adr: adr(roomRevenue, occupiedRooms),
      revpar: revpar(roomRevenue, totalRooms),
      housekeeping,
      ready: true,
    };
  } catch {
    return empty;
  }
}
