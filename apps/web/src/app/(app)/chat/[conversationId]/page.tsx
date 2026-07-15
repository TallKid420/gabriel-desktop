import { ConversationView } from '@/features/chat/conversation-view';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  // Conversation ids are GRNs (contain `:` and `/`) and arrive percent-encoded.
  return <ConversationView conversationId={decodeURIComponent(conversationId)} />;
}
