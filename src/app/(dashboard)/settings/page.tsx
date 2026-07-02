import Link from 'next/link';
import { BedDouble, DoorOpen, CalendarRange, Cable, ChevronRight } from 'lucide-react';
import { requireRole } from '@/lib/auth/guard';
import { Card, CardContent } from '@/components/ui/card';

// Hub de configuración: enlaces a los submódulos de inventario.
export default async function SettingsPage() {
  await requireRole(['admin', 'manager']);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Inventario y ajustes de la propiedad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingLink
          href="/settings/room-types"
          icon={BedDouble}
          title="Tipos de habitación"
          description="Categorías, ocupación y tarifa base."
        />
        <SettingLink
          href="/settings/rooms"
          icon={DoorOpen}
          title="Habitaciones"
          description="Unidades físicas, piso y estado de limpieza."
        />
        <SettingLink
          href="/settings/rates"
          icon={CalendarRange}
          title="Calendario de tarifas"
          description="Precios y disponibilidad por fecha."
        />
        <SettingLink
          href="/settings/channels"
          icon={Cable}
          title="Conexiones de canal"
          description="Sincronización iCal con Airbnb y Booking."
        />
      </div>
    </div>
  );
}

function SettingLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/40 hover:ring-primary/40">
        <CardContent className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
