'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  MessagesSquare,
  FileText,
  Bot,
  Brain,
  Boxes,
  CornerDownLeft,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { NAV_WORKSPACES, ICONS } from '@/config/navigation';
import { useUIStore } from '@/stores/ui-store';
import { search as searchService } from '@/services';
import type { SearchEntityType, SearchResult } from '@/types';

const ENTITY_ICON: Record<SearchEntityType, typeof FileText> = {
  conversation: MessagesSquare,
  document: FileText,
  agent: Bot,
  memory: Brain,
  resource: Boxes,
  workflow: Boxes,
};

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const askAssistant = useUIStore((s) => s.askAssistant);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Debounced cross-entity search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      searchService.search(q).then((r) => active && setResults(r));
    }, 160);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  // Reset query whenever the palette closes.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search or jump to…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {query.trim() && (
          <CommandGroup heading="Ask Gabriel">
            <CommandItem
              value={`ask ${query}`}
              onSelect={() => {
                askAssistant(query);
                setOpen(false);
              }}
            >
              <Sparkles />
              <span>
                Ask the assistant: “{query}”
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((r) => {
              const Icon = ENTITY_ICON[r.entityType];
              return (
                <CommandItem
                  key={`${r.entityType}-${r.id}`}
                  value={`${r.title} ${r.subtitle ?? ''} ${r.entityType}`}
                  onSelect={() => go(r.href)}
                >
                  <Icon />
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {r.entityType}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Go to workspace">
          {NAV_WORKSPACES.map((w) => {
            const Icon = ICONS[w.icon];
            return (
              <CommandItem
                key={w.id}
                value={`go ${w.label}`}
                onSelect={() => go(w.href)}
              >
                {Icon && <Icon />}
                <span className="flex-1">{w.label}</span>
                <CornerDownLeft className="size-3.5 opacity-0 aria-selected:opacity-60" />
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
