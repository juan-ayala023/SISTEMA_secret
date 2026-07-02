import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';

// Devuelve la sesión + perfil del usuario actual, o null si no hay sesión.
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
  };
}

// Exige sesión válida con perfil. Redirige a /login si no la hay.
export async function requireProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  // Perfil inexistente o sin propiedad asignada → onboarding.
  if (!session.profile || !session.profile.property_id) redirect('/onboarding');
  return { ...session, profile: session.profile };
}

// Exige que el rol del usuario esté entre los permitidos.
export async function requireRole(allowed: UserRole[]) {
  const session = await requireProfile();
  if (!allowed.includes(session.profile.role)) {
    redirect('/'); // sin permiso → al dashboard
  }
  return session;
}
