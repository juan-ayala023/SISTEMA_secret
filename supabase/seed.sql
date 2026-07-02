-- =====================================================================
-- SEED de demostración (opcional)
-- Ejecutar DESPUÉS de la migración y DESPUÉS de crear tu usuario en Auth.
--
-- Pasos:
--  1. Supabase → Authentication → Add user (email/password). Copia su UUID.
--  2. Reemplaza '<TU_AUTH_USER_ID>' abajo por ese UUID.
--  3. Corre este script en el SQL Editor.
-- =====================================================================

do $$
declare
  v_property_id uuid;
  v_user_id uuid := '<TU_AUTH_USER_ID>';  -- <-- REEMPLAZAR
  v_rt_suite uuid;
  v_rt_domo uuid;
begin
  -- Propiedad
  insert into properties (name, phone, address)
  values ('Glamping Demo MarkFusion', '+57 300 000 0000', 'Vereda El Retiro, Colombia')
  returning id into v_property_id;

  -- Enlazar tu usuario como admin de la propiedad
  update profiles
     set property_id = v_property_id, role = 'admin', full_name = 'Administrador Demo'
   where id = v_user_id;

  -- Tipos de habitación
  insert into room_types (property_id, name, description, base_occupancy, max_occupancy, base_rate)
  values (v_property_id, 'Suite Deluxe', 'Suite con jacuzzi', 2, 3, 450000)
  returning id into v_rt_suite;

  insert into room_types (property_id, name, description, base_occupancy, max_occupancy, base_rate)
  values (v_property_id, 'Glamping Domo', 'Domo geodésico con vista', 2, 2, 320000)
  returning id into v_rt_domo;

  -- Habitaciones
  insert into rooms (property_id, room_type_id, name, floor) values
    (v_property_id, v_rt_suite, '101', '1'),
    (v_property_id, v_rt_suite, '102', '1'),
    (v_property_id, v_rt_domo, 'Domo 1', null),
    (v_property_id, v_rt_domo, 'Domo 2', null),
    (v_property_id, v_rt_domo, 'Domo 3', null);
end $$;
