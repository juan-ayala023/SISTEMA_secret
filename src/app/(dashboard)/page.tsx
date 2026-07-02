import {
  LogIn,
  LogOut,
  BedDouble,
  TrendingUp,
  DollarSign,
  Percent,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { requireProfile } from '@/lib/auth/guard';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/queries/dashboard';
import { formatCOP } from '@/lib/utils/currency';
import { formatPercent } from '@/lib/utils/kpi';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Property } from '@/types/database';

export default async function DashboardHome() {
  const { profile } = await requireProfile();

  const supabase = await createClient();
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', profile.property_id!)
    .single<Property>();

  const timezone = property?.timezone ?? 'America/Bogota';
  const data = await getDashboardData(profile.property_id!, timezone);

  const hk = data.housekeeping;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard de recepción</h1>
        <p className="text-sm text-muted-foreground">
          Resumen del día · {data.today}
        </p>
      </div>

      {!data.ready && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              No se pudieron leer los datos en vivo. Verifica la conexión a
              Supabase; mientras tanto se muestran valores en cero.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Movimiento del día */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Llegadas de hoy"
          value={data.arrivals}
          icon={LogIn}
          accent="text-green-600"
        />
        <StatCard
          label="Salidas de hoy"
          value={data.departures}
          icon={LogOut}
          accent="text-orange-600"
        />
        <StatCard
          label="En casa"
          value={data.inHouse}
          icon={BedDouble}
          accent="text-blue-600"
          hint={`${data.occupiedRooms}/${data.totalRooms} habitaciones`}
        />
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ocupación"
          value={formatPercent(data.occupancy)}
          icon={Percent}
          accent="text-indigo-600"
        />
        <StatCard
          label="ADR"
          value={formatCOP(data.adr)}
          icon={DollarSign}
          accent="text-emerald-600"
          hint="Tarifa promedio diaria"
        />
        <StatCard
          label="RevPAR"
          value={formatCOP(data.revpar)}
          icon={TrendingUp}
          accent="text-fuchsia-600"
          hint="Ingreso por habitación disponible"
        />
      </section>

      {/* Housekeeping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            Estado de housekeeping
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <HkStat label="Limpias" value={hk.clean} color="text-green-600" />
          <HkStat label="Sucias" value={hk.dirty} color="text-orange-600" />
          <HkStat
            label="Inspeccionadas"
            value={hk.inspected}
            color="text-blue-600"
          />
          <HkStat
            label="Fuera de servicio"
            value={hk.out_of_order}
            color="text-red-600"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function HkStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
