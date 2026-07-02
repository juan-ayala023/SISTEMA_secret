import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { todayInTZ } from '@/lib/utils/dates';
import type { Rate } from '@/types/database';
import { RateManager, type RateRow, type RateRoomType } from './rate-manager';

export default async function RatesPage() {
  const { profile } = await requireRole(['admin', 'manager']);
  const propertyId = profile.property_id!;

  const supabase = await createClient();
  const { data: types } = await supabase
    .from('room_types')
    .select('id, name, base_rate')
    .eq('property_id', propertyId)
    .order('name');

  const typeIds = (types ?? []).map((t) => t.id);
  let rates: Rate[] = [];
  if (typeIds.length > 0) {
    const { data } = await supabase
      .from('rates')
      .select('*')
      .in('room_type_id', typeIds)
      .gte('date', todayInTZ())
      .order('date');
    rates = (data as Rate[]) ?? [];
  }

  return (
    <RateManager
      roomTypes={(types as RateRoomType[]) ?? []}
      rates={rates as RateRow[]}
    />
  );
}
