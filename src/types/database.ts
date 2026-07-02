// Tipos de la base de datos.
//
// En cuanto conectes un proyecto Supabase real, regenera este archivo con:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
// Por ahora está escrito a mano para reflejar supabase/migrations/0001_init.sql.

export type UserRole = 'admin' | 'manager' | 'reception' | 'housekeeping';
export type RoomStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_order';
export type ReservationStatus =
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';
export type ReservationSource =
  | 'direct'
  | 'airbnb'
  | 'booking'
  | 'walk_in'
  | 'whatsapp';
export type FolioItemType = 'charge' | 'payment';
export type HousekeepingStatus = 'pending' | 'in_progress' | 'done';
export type Channel = 'airbnb' | 'booking';

export interface Property {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  property_id: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  description: string | null;
  base_occupancy: number;
  max_occupancy: number;
  base_rate: number;
  created_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id: string;
  name: string;
  floor: string | null;
  status: RoomStatus;
  created_at: string;
}

export interface Rate {
  id: string;
  room_type_id: string;
  date: string;
  price: number;
  min_stay: number;
  closed: boolean;
}

export interface Guest {
  id: string;
  property_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document_id: string | null;
  nationality: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  property_id: string;
  guest_id: string | null;
  room_type_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  source: ReservationSource;
  external_uid: string | null;
  adults: number;
  children: number;
  total_amount: number;
  balance: number;
  notes: string | null;
  created_at: string;
}

export interface FolioItem {
  id: string;
  reservation_id: string;
  type: FolioItemType;
  description: string;
  amount: number;
  method: string | null;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  property_id: string;
  room_id: string;
  date: string;
  status: HousekeepingStatus;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface ChannelConnection {
  id: string;
  property_id: string;
  room_type_id: string;
  channel: Channel;
  ical_import_url: string | null;
  last_synced_at: string | null;
  created_at: string;
}
