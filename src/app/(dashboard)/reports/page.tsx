import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarRange, DollarSign, Moon, TrendingUp } from 'lucide-react';
import { requireProfile } from '@/lib/auth/guard';
import { getReport } from '@/lib/queries/reports';
import { todayInTZ } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/currency';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { ReservationSource, ReservationStatus } from '@/types/database';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: 'Confirmadas',
  checked_in: 'En casa',
  checked_out: 'Salidas',
  cancelled: 'Canceladas',
  no_show: 'No-show',
};

const SOURCE_LABELS: Record<ReservationSource, string> = {
  direct: 'Directa',
  airbnb: 'Airbnb',
  booking: 'Booking',
  walk_in: 'Walk-in',
  whatsapp: 'WhatsApp',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { profile } = await requireProfile();
  const sp = await searchParams;

  const today = parseISO(todayInTZ());
  const from = sp.from || format(startOfMonth(today), 'yyyy-MM-dd');
  const to = sp.to || format(endOfMonth(today), 'yyyy-MM-dd');

  const report = await getReport(profile.property_id!, from, to);

  const periodLabel = `${format(parseISO(from), 'd MMM', {
    locale: es,
  })} – ${format(parseISO(to), 'd MMM yyyy', { locale: es })}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Reservas por fecha de entrada · {periodLabel}
        </p>
      </div>

      {/* Selector de periodo (GET, sin JS) */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from">Desde</Label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={from}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Hasta</Label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={to}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <Button type="submit" variant="outline">
              Aplicar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservas"
          value={report.active}
          icon={CalendarRange}
          accent="text-blue-600"
          hint={`${report.total} incl. canceladas`}
        />
        <StatCard
          label="Ingresos"
          value={formatCOP(report.revenue)}
          icon={DollarSign}
          accent="text-emerald-600"
        />
        <StatCard
          label="Noches vendidas"
          value={report.nightsSold}
          icon={Moon}
          accent="text-indigo-600"
        />
        <StatCard
          label="ADR"
          value={formatCOP(report.adr)}
          icon={TrendingUp}
          accent="text-fuchsia-600"
          hint="Tarifa promedio por noche"
        />
      </section>

      {/* Desgloses */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Breakdown
          title="Por estado"
          rows={(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((k) => ({
            label: STATUS_LABELS[k],
            value: report.byStatus[k],
          }))}
        />
        <Breakdown
          title="Por origen"
          rows={(Object.keys(SOURCE_LABELS) as ReservationSource[]).map((k) => ({
            label: SOURCE_LABELS[k],
            value: report.bySource[k],
          }))}
        />
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
