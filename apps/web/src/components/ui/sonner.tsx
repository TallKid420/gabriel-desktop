'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useUIStore } from '@/stores/ui-store';

/**
 * Toast host, themed from the UI store. Notifications proper are delivered by
 * the Notification Service (ADR-032); this is only the transient toast surface.
 */
export function Toaster(props: ToasterProps) {
  const theme = useUIStore((s) => s.theme);
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
