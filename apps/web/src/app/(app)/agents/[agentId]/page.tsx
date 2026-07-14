import { AgentDetail } from '@/features/agents/agent-detail';

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  // Agent ids are GRNs (contain `:` and `/`) and arrive percent-encoded.
  return <AgentDetail agentId={decodeURIComponent(agentId)} />;
}
