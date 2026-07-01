import type { ReactNode } from 'react';
import { ConversationList } from '@/features/chat/conversation-list';

/**
 * Chat is a full-bleed two-pane workspace: a conversation rail plus the active
 * conversation. We negate the shell's content padding so the panes fill the
 * available height, while each pane manages its own internal scroll.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] sm:-m-6 sm:h-[calc(100%+3rem)]">
      <ConversationList />
      {children}
    </div>
  );
}
