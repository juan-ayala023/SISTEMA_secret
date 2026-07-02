// Cálculos de indicadores hoteleros.
//
//   Ocupación = habitaciones ocupadas / habitaciones totales
//   ADR (Average Daily Rate) = ingresos por alojamiento / noches vendidas
//   RevPAR (Revenue per Available Room) = ingresos por alojamiento / habitaciones disponibles

export function occupancyRate(occupiedRooms: number, totalRooms: number): number {
  if (totalRooms <= 0) return 0;
  return occupiedRooms / totalRooms;
}

export function adr(roomRevenue: number, roomNightsSold: number): number {
  if (roomNightsSold <= 0) return 0;
  return roomRevenue / roomNightsSold;
}

export function revpar(roomRevenue: number, availableRooms: number): number {
  if (availableRooms <= 0) return 0;
  return roomRevenue / availableRooms;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
