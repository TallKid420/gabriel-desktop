'use client';

import { useRef } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBytes, formatRelativeTime } from '@/lib/format';
import type { DocumentStatus } from '@/types';
import { useDocuments, useUploadDocument, useDeleteDocument } from './hooks';

const STATUS_VARIANT: Record<DocumentStatus, 'success' | 'warning' | 'destructive'> = {
  ready: 'success',
  processing: 'warning',
  failed: 'destructive',
};

export function DocumentsView() {
  const { data: docs, isLoading, isError, refetch } = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success(`Uploading "${file.name}" — processing will finish shortly`);
    } catch {
      toast.error('Upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDelete = async (id: string, title: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Document Library"
        description="Documents are ingested by Core (hashing, normalization and storage happen server-side). The library only uploads and lists them."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={onPick}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </>
        }
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingRows count={5} />}

      {docs && docs.length === 0 && (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No documents yet"
          description="Upload a document to make it available to your agents."
          action={
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Upload a document
            </Button>
          }
        />
      )}

      {docs && docs.length > 0 && (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {docs.map((d) => (
            <div key={d.grn} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.filename}
                  {d.byteSize ? ` · ${formatBytes(d.byteSize)}` : ''}
                  {d.owner ? ` · ${d.owner}` : ''}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {formatRelativeTime(d.updatedAt)}
              </span>
              <Badge variant={STATUS_VARIANT[d.status]} className="shrink-0">
                {d.status === 'processing' && (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                )}
                {d.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(d.id, d.title)}
                disabled={remove.isPending}
                aria-label={`Delete ${d.title}`}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
