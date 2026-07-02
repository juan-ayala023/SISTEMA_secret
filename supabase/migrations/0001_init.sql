-- =====================================================================
-- PMS MarkFusion — Migración inicial (Fase 1)
-- Esquema multi-tenant aislado por property_id con Row Level Security.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- constraint anti-solapamiento

-- =========================================================
-- PROPIEDADES (tenants)
-- =========================================================
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text default 'America/Bogota',
  currency text default 'COP',
  address text,
  phone text,
  created_at timestamptz default now()
);

-- =========================================================
-- PERFILES / STAFF (enlaza con auth.users)
-- =========================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  full_name text,
  role text check (role in ('admin','manager','reception','housekeeping')) default 'reception',
  created_at timestamptz default now()
);

-- =========================================================
-- TIPOS DE HABITACIÓN
-- =========================================================
create table room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  name text not null,
  description text,
  base_occupancy int default 2,
  max_occupancy int default 2,
  base_rate numeric(12,2) not null,
  created_at timestamptz default now()
);
create index idx_room_types_property on room_types (property_id);

-- =========================================================
-- HABITACIONES / UNIDADES
-- =========================================================
create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  room_type_id uuid references room_types(id) on delete cascade not null,
  name text not null,
  floor text,
  status text check (status in ('clean','dirty','inspected','out_of_order')) default 'clean',
  created_at timestamptz default now()
);
create index idx_rooms_property on rooms (property_id);
create index idx_rooms_type on rooms (room_type_id);

-- =========================================================
-- TARIFAS POR FECHA (rate calendar)
-- =========================================================
create table rates (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid references room_types(id) on delete cascade not null,
  date date not null,
  price numeric(12,2) not null,
  min_stay int default 1,
  closed boolean default false,
  unique (room_type_id, date)
);
create index idx_rates_type_date on rates (room_type_id, date);

-- =========================================================
-- HUÉSPEDES
-- =========================================================
create table guests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  document_id text,
  nationality text,
  notes text,
  created_at timestamptz default now()
);
create index idx_guests_property on guests (property_id);
create index idx_guests_search on guests (property_id, last_name, document_id);

-- =========================================================
-- RESERVAS
-- =========================================================
create table reservations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  guest_id uuid references guests(id) on delete set null,
  room_type_id uuid references room_types(id) not null,
  room_id uuid references rooms(id),
  check_in date not null,
  check_out date not null,
  status text check (status in ('confirmed','checked_in','checked_out','cancelled','no_show')) default 'confirmed',
  source text check (source in ('direct','airbnb','booking','walk_in','whatsapp')) default 'direct',
  external_uid text,
  adults int default 1,
  children int default 0,
  total_amount numeric(12,2) default 0,
  balance numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  constraint chk_reservation_dates check (check_out > check_in)
);
create index idx_reservations_dates on reservations (property_id, check_in, check_out);
create index idx_reservations_room on reservations (room_id);

-- Regla de negocio: una habitación no puede tener dos reservas solapadas.
-- Se ignoran reservas canceladas / no-show. El rango [check_in, check_out)
-- trata el día de check-out como libre (noche de hotel).
alter table reservations
  add constraint no_overlap_per_room
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (room_id is not null and status not in ('cancelled','no_show'));

-- =========================================================
-- FOLIO (cargos y pagos por reserva)
-- =========================================================
create table folio_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references reservations(id) on delete cascade not null,
  type text check (type in ('charge','payment')) not null,
  description text not null,
  amount numeric(12,2) not null,
  method text,
  created_at timestamptz default now()
);
create index idx_folio_reservation on folio_items (reservation_id);

-- =========================================================
-- HOUSEKEEPING
-- =========================================================
create table housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  room_id uuid references rooms(id) on delete cascade not null,
  date date default current_date,
  status text check (status in ('pending','in_progress','done')) default 'pending',
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);
create index idx_housekeeping_property_date on housekeeping_tasks (property_id, date);

-- =========================================================
-- CONEXIONES DE CANAL (iCal)
-- =========================================================
create table channel_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  room_type_id uuid references room_types(id) on delete cascade not null,
  channel text check (channel in ('airbnb','booking')) not null,
  ical_import_url text,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
create index idx_channels_property on channel_connections (property_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

-- Helper con SECURITY DEFINER: devuelve las propiedades del usuario actual.
-- Evita recursión de políticas al consultar profiles dentro de las policies.
create or replace function public.auth_property_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select property_id from public.profiles where id = auth.uid();
$$;

-- ---------- properties ----------
alter table properties enable row level security;
create policy "properties_select" on properties
  for select using (id in (select public.auth_property_ids()));
create policy "properties_write" on properties
  for all using (id in (select public.auth_property_ids()))
  with check (id in (select public.auth_property_ids()));

-- ---------- profiles ----------
alter table profiles enable row level security;
-- Cada usuario ve su propio perfil...
create policy "profiles_self" on profiles
  for select using (id = auth.uid());
-- ...y los perfiles de su misma propiedad (para asignaciones de housekeeping).
create policy "profiles_same_property" on profiles
  for select using (property_id in (select public.auth_property_ids()));
create policy "profiles_update_self" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Tablas con property_id directo ----------
-- room_types
alter table room_types enable row level security;
create policy "room_types_all" on room_types
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- rooms
alter table rooms enable row level security;
create policy "rooms_all" on rooms
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- guests
alter table guests enable row level security;
create policy "guests_all" on guests
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- reservations
alter table reservations enable row level security;
create policy "reservations_all" on reservations
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- housekeeping_tasks
alter table housekeeping_tasks enable row level security;
create policy "housekeeping_all" on housekeeping_tasks
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- channel_connections
alter table channel_connections enable row level security;
create policy "channels_all" on channel_connections
  for all using (property_id in (select public.auth_property_ids()))
  with check (property_id in (select public.auth_property_ids()));

-- ---------- rates (aislada vía room_type -> property) ----------
alter table rates enable row level security;
create policy "rates_all" on rates
  for all using (
    room_type_id in (
      select id from room_types where property_id in (select public.auth_property_ids())
    )
  )
  with check (
    room_type_id in (
      select id from room_types where property_id in (select public.auth_property_ids())
    )
  );

-- ---------- folio_items (aislada vía reservation -> property) ----------
alter table folio_items enable row level security;
create policy "folio_all" on folio_items
  for all using (
    reservation_id in (
      select id from reservations where property_id in (select public.auth_property_ids())
    )
  )
  with check (
    reservation_id in (
      select id from reservations where property_id in (select public.auth_property_ids())
    )
  );

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Crear un profile automáticamente al registrarse un usuario en auth.users.
-- property_id queda null: un admin debe asignar la propiedad después.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'reception')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al hacer check-out, marcar la habitación como 'dirty'.
create or replace function public.mark_room_dirty_on_checkout()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'checked_out'
     and old.status is distinct from 'checked_out'
     and new.room_id is not null then
    update rooms set status = 'dirty' where id = new.room_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_room_dirty_on_checkout on reservations;
create trigger trg_room_dirty_on_checkout
  after update on reservations
  for each row execute function public.mark_room_dirty_on_checkout();
