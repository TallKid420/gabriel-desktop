'use client';

import { useMemo, useRef, useState } from 'react';
import { Upload, FileText, Trash2, Loader2, Plus, Library } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatBytes, formatRelativeTime } from '@/lib/format';
import type { DocumentStatus } from '@/types';
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useKnowledgeSources,
  useCreateKnowledgeSource,
} from './hooks';

const STATUS_VARIANT: Record<DocumentStatus, 'success' | 'warning' | 'destructive'> = {
  ready: 'success',
  processing: 'warning',
  failed: 'destructive',
};

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function DocumentsView() {
  const { data: docs, isLoading, isError, refetch } = useDocuments();
  const { data: sources } = useKnowledgeSources();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const createSource = useCreateKnowledgeSource();
  const fileRef = useRef<HTMLInputElement>(null);

  const [targetSource, setTargetSource] = useState('');
  const [dragging, setDragging] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');

  const sourceNameByGrn = useMemo(() => {
    const map = new Map<string, string>();
    (sources ?? []).forEach((s) => map.set(s.grn, s.name));
    return map;
  }, [sources]);

  const doUpload = async (file: File) => {
    try {
      await upload.mutateAsync({
        file,
        knowledgeSourceGrn: targetSource || undefined,
      });
      toast.success(`Uploading "${file.name}" — processing will finish shortly`);
    } catch {
      toast.error('Upload failed');
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await doUpload(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await doUpload(file);
  };

  const onDelete = async (id: string, title: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleCreateSource = async () => {
    if (!newSourceName.trim()) return;
    try {
      const created = await createSource.mutateAsync({
        name: newSourceName.trim(),
        description: newSourceDesc.trim() || undefined,
      });
      setTargetSource(created.grn);
      setSourceDialogOpen(false);
      setNewSourceName('');
      setNewSourceDesc('');
      toast.success(`Created knowledge source "${created.name}"`);
    } catch {
      toast.error('Failed to create knowledge source');
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Document Library"
        description="Upload documents so your agents can ground answers in them. Ingestion (hashing, chunking, embeddings) happens server-side."
      />

      {/* Upload zone */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="target-source">Attach to knowledge source</Label>
            <select
              id="target-source"
              value={targetSource}
              onChange={(e) => setTargetSource(e.target.value)}
              className={selectClass}
            >
              <option value="">None (library only)</option>
              {(sources ?? []).map((s) => (
                <option key={s.grn} value={s.grn}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={() => setSourceDialogOpen(true)}>
            <Plus className="size-4" />
            New source
          </Button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
          )}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={onPick} />
          {upload.isPending ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <Upload className="size-6 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {upload.isPending
              ? 'Uploading…'
              : 'Drag & drop a file here, or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">
            {targetSource
              ? `Will be linked to “${sourceNameByGrn.get(targetSource) ?? 'source'}”`
              : 'PDF, text, Markdown, and more'}
          </p>
        </div>
      </div>

      <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New knowledge source</DialogTitle>
            <DialogDescription>
              A named collection of documents agents can be grounded in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="source-name">Name</Label>
              <Input
                id="source-name"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="Policy handbook"
                disabled={createSource.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source-desc">Description (optional)</Label>
              <Input
                id="source-desc"
                value={newSourceDesc}
                onChange={(e) => setNewSourceDesc(e.target.value)}
                placeholder="What this collection contains"
                disabled={createSource.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSourceDialogOpen(false)}
              disabled={createSource.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateSource()}
              disabled={!newSourceName.trim() || createSource.isPending}
            >
              {createSource.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingRows count={5} />}

      {docs && docs.length === 0 && (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No documents yet"
          description="Upload a document to make it available to your agents."
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
                  {typeof d.chunkCount === 'number'
                    ? ` · ${d.chunkCount} chunk${d.chunkCount === 1 ? '' : 's'}`
                    : ''}
                </p>
                {d.knowledgeSourceGrn && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Library className="size-3" />
                    {sourceNameByGrn.get(d.knowledgeSourceGrn) ?? 'Knowledge source'}
                  </p>
                )}
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
