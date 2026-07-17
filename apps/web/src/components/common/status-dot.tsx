import { cn } from '@/lib/utils';

export type StatusDotStatus =
  | 'active'
  | 'running'
  | 'idle'
  | 'scheduled'
  | 'paused'
  | 'draft';

export function StatusDot({ status }: { status: StatusDotStatus }) {
  const color =
    status === 'active' || status === 'running'
      ? 'bg-chart-3'
      : status === 'idle' || status === 'scheduled'
        ? 'bg-chart-5'
        : 'bg-muted-foreground';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      {status}
    </span>
  );
}
