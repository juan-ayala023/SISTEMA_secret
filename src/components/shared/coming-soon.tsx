import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Placeholder para módulos aún no implementados (fases siguientes).
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Construction className="size-7" />
          </div>
          <p className="max-w-md text-sm">{description}</p>
          <p className="text-xs">Próximamente en la siguiente fase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
