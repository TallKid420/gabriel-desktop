import { MessagesSquare } from 'lucide-react';

/** Empty state shown when no conversation is selected. */
export default function ChatIndexPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <MessagesSquare className="size-6" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">Select a conversation</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Choose an existing conversation from the left, or start a new one to
          begin working with an agent.
        </p>
      </div>
    </div>
  );
}
