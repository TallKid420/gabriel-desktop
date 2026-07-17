import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </span>
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
          positive
            ? 'bg-chart-3/15 text-chart-3'
            : 'bg-destructive/15 text-destructive',
        )}
      >
        {positive ? '↑' : '↓'} {delta}
      </span>
    </Card>
  );
}
