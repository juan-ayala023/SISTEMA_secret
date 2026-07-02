import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { getSessionProfile } from '@/lib/auth/guard';
import { signOut } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Se muestra cuando el usuario está autenticado pero aún no tiene
// una propiedad (tenant) asignada en su perfil.
export default async function OnboardingPage() {
  const session = await getSessionProfile();
  if (!session) redirect('/login');
  if (session.profile?.property_id) redirect('/');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertCircle className="size-6" />
          </div>
          <CardTitle className="text-xl">Cuenta sin propiedad asignada</CardTitle>
          <CardDescription>
            Tu usuario ({session.email}) ya existe, pero todavía no está
            vinculado a ninguna propiedad. Un administrador debe asignarte una
            propiedad antes de que puedas usar el panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Si eres el administrador, ejecuta <code>supabase/seed.sql</code> o
            actualiza la columna <code>property_id</code> de tu fila en la tabla{' '}
            <code>profiles</code>.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
