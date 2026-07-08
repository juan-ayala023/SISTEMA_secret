create table channel_sync_status (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  channel text not null,
  status text not null default 'idle'
    check (status in ('idle','running','ok','error')),
  triggered_by text
    check (triggered_by in ('schedule','manual','webhook')),
  last_run_at timestamptz,
  last_success_at timestamptz,
  message text,
  detail jsonb,
  updated_at timestamptz default now() not null,
  unique (property_id, channel)
);

alter table channel_sync_status enable row level security;

create policy "tenant_sync_status" on channel_sync_status
  for select using (property_id = auth_property_id());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sync_status_touch
  before update on channel_sync_status
  for each row execute function public.touch_updated_at();

insert into channel_sync_status (property_id, channel, status)
values
  ('886d4492-6102-4874-8778-4051ff3eaa09','airbnb','idle'),
  ('886d4492-6102-4874-8778-4051ff3eaa09','booking','idle'),
  ('886d4492-6102-4874-8778-4051ff3eaa09','calendar','idle')
on conflict (property_id, channel) do nothing;
