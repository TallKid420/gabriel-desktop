'use client';

import { Boxes, Plug, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useResources } from './hooks';

/** Narrowing helper for the loosely-typed Resource.attributes bag. */
function attr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function ResourcesView() {
  const { data: resources, isLoading, isError, refetch } = useResources();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Resources"
        description="Everything in Gabriel is a Resource addressed by a GRN (ADR-005). Connect external systems to give agents governed access."
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingGrid count={4} />}

      {resources && resources.length === 0 && (
        <EmptyState
          icon={<Boxes className="size-5" />}
          title="No resources"
          description="Connected integrations and other resources will appear here."
        />
      )}

      {resources && resources.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => {
            const connected = r.attributes.connected === true;
            const name = attr(r.attributes.name) || r.grn;
            const kind = attr(r.attributes.kind);
            const detail = attr(r.attributes.detail);
            return (
              <Card key={r.grn} className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Plug className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    {kind && (
                      <p className="truncate text-xs text-muted-foreground">{kind}</p>
                    )}
                  </div>
                  {connected ? (
                    <Badge variant="success">
                      <Check className="mr-1 size-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>
                {detail && (
                  <p className="text-xs text-muted-foreground">{detail}</p>
                )}
                <p className="truncate font-mono text-[11px] text-muted-foreground/70">
                  {r.grn}
                </p>
                {!connected && (
                  <Button variant="outline" size="sm" className="mt-auto">
                    Connect
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
