'use client';

import { useState } from 'react';
import { Brain } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MemoryLayer } from '@/types';
import { useMemories } from './hooks';

const LAYERS: { id: MemoryLayer | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'working', label: 'Working' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'procedural', label: 'Procedural' },
  { id: 'organizational', label: 'Organizational' },
];

export function MemoryView() {
  const [layer, setLayer] = useState<MemoryLayer | 'all'>('all');
  const { data: memories, isLoading, isError, refetch } = useMemories(
    layer === 'all' ? undefined : layer,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Memory Browser"
        description="Inspect what your organization's agents remember (ADR-012 Multi-Layer Memory). Storage and retrieval live in Core; this is a read-only lens."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayer(l.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              layer === l.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingRows count={4} />}

      {memories && memories.length === 0 && (
        <EmptyState
          icon={<Brain className="size-5" />}
          title="No memories in this layer"
          description="Memories accumulate as agents work within your organization."
        />
      )}

      {memories && memories.length > 0 && (
        <div className="flex flex-col gap-3">
          {memories.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{m.label}</p>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {m.layer}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {m.category && <span>Category: {m.category}</span>}
                {m.source && <span>Source: {m.source}</span>}
                {typeof m.confidence === 'number' && (
                  <span className="inline-flex items-center gap-1.5">
                    Confidence
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${m.confidence}%` }}
                      />
                    </span>
                    {m.confidence}%
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
