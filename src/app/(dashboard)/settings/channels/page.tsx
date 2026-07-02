import { requireRole } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import type { ChannelConnection } from '@/types/database';
import {
  ChannelManager,
  type ChannelRow,
  type ChannelRoomType,
} from './channel-manager';

export default async function ChannelsPage() {
  const { profile } = await requireRole(['admin', 'manager']);
  const propertyId = profile.property_id!;

  const supabase = await createClient();
  const [connRes, typesRes] = await Promise.all([
    supabase
      .from('channel_connections')
      .select('*, room_type:room_types(name)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('room_types')
      .select('id, name')
      .eq('property_id', propertyId)
      .order('name'),
  ]);

  const connections =
    (connRes.data as (ChannelConnection & {
      room_type: { name: string } | null;
    })[]) ?? [];

  return (
    <ChannelManager
      connections={connections as ChannelRow[]}
      roomTypes={(typesRes.data as ChannelRoomType[]) ?? []}
    />
  );
}
