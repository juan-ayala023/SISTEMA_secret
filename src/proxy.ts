import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16: el antiguo `middleware` se renombró a `proxy` y, al usar el
// directorio `src/`, debe vivir junto a `src/app` (no en la raíz del repo).
// Refresca la sesión de Supabase en cada request y protege el grupo (dashboard).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todas las rutas excepto /api (autentican con su propio token),
    // assets estáticos y archivos de imagen.
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
