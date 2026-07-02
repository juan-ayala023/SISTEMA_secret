import { requireProfile } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import type { Property } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: exige sesión + perfil con propiedad asignada.
  const { email, profile } = await requireProfile();

  // Nombre de la propiedad (RLS garantiza que solo vea la suya).
  const supabase = await createClient();
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', profile.property_id!)
    .single<Property>();

  const propertyName = property?.name ?? 'Mi propiedad';
  const fullName = profile.full_name ?? email ?? 'Usuario';

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={profile.role} propertyName={propertyName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar fullName={fullName} email={email ?? ''} role={profile.role} />
        <main className="flex-1 bg-muted/40 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
