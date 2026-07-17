import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'warning';
}) {
  const tones = {
    neutral: 'bg-accent text-accent-foreground',
    primary: 'bg-primary/15 text-primary',
    success: 'bg-chart-3/15 text-chart-3',
    warning: 'bg-chart-5/15 text-chart-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
