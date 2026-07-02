# PMS MarkFusion

Property Management System multi-tenant para hoteles, glampings y hospedajes boutique
(inspirado en Cloudbeds, enfocado en Colombia — COP y multi-propiedad).

## Stack

- **Next.js 16** (App Router) + **TypeScript** estricto
- **Tailwind CSS 4** + **shadcn/ui** + **lucide-react**
- **Supabase** (PostgreSQL + Auth + Realtime) con **RLS** por `property_id`
- **TanStack Query** · **react-hook-form** + **zod** · **date-fns**

## Estado actual — Fase 1 (checkpoint)

✅ Auth (login) + middleware de sesión y protección de rutas
✅ Layout del dashboard con **guard por rol** (admin / manager / reception / housekeeping)
✅ Dashboard de recepción: llegadas, salidas, en casa, KPIs (Ocupación, ADR, RevPAR) y housekeeping
✅ Migración SQL completa con esquema + RLS + triggers
🚧 Tape chart, reservas, huéspedes, folio y configuración → placeholders (siguientes pasos)

## Puesta en marcha

### 1. Crear el proyecto Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)

### 2. Correr la migración
En el **SQL Editor** de Supabase, pega y ejecuta `supabase/migrations/0001_init.sql`.

### 3. Crear tu usuario y propiedad
1. Supabase → **Authentication → Add user** (email/password). El trigger crea su `profile`.
2. Edita `supabase/seed.sql`: reemplaza `<TU_AUTH_USER_ID>` por el UUID del usuario.
3. Ejecuta `supabase/seed.sql` en el SQL Editor (crea la propiedad demo y te asigna como admin).

### 4. (Opcional) Regenerar tipos
```bash
npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts
```

### 5. Arrancar
```bash
npm run dev
```
Abre http://localhost:3000 → serás redirigido a `/login`.

## Estructura

```
src/
  app/
    (auth)/login, (auth)/onboarding
    (dashboard)/            # layout con guard + KPIs
      calendar, reservations, guests, housekeeping, reports, settings
  components/ui             # shadcn
  components/shared         # sidebar, topbar, stat-card
  lib/
    supabase/               # client, server, middleware
    auth/                   # guard (roles), actions (signOut)
    queries/                # dashboard
    utils/                  # currency (COP), kpi, dates
  types/database.ts
supabase/migrations/0001_init.sql
supabase/seed.sql
```

## Notas de seguridad

- El frontend usa **solo** la `anon key`. La `service_role` nunca se expone al cliente.
- Todas las tablas nacen con **RLS** y aislamiento por `property_id`.
- La regla "una habitación no puede tener dos reservas solapadas" se garantiza con un
  `EXCLUDE` constraint (btree_gist) en la tabla `reservations`.
