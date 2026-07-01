/**
 * Scripted mock streams for M0. Produces believable token-by-token chat
 * responses and agent lifecycle transitions so streaming UIs work before the
 * Gateway exists.
 */
import type { MockScript } from './mock-transport';

function replyFor(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('board') || p.includes('digest'))
    return 'Drafting the weekly board digest now. I pulled revenue, pipeline, and incident summaries, and prepared a draft in your Documents workspace for review.';
  if (p.includes('policy') || p.includes('claim'))
    return 'I reviewed the relevant policy documents and summarized the coverage terms. Key exclusions and deductibles are highlighted for your attention.';
  if (p.includes('workflow') || p.includes('fail'))
    return 'All active workflows are healthy. One had two retries this morning that succeeded on the second attempt — no action needed.';
  return 'On it. I am coordinating the relevant agents and will surface results in your workspace, keeping context scoped to your organization.';
}

/**
 * Chat streaming script: emits agent lifecycle states, then streams tokens,
 * then a done frame. Channel path is expected to be `chat/{conversationId}`
 * with the prompt supplied via options.body.
 */
export const chatMockScript: MockScript = (path, options, emit) => {
  if (!path.startsWith('chat/')) return;
  const prompt =
    (options?.body as { content?: string } | undefined)?.content ?? '';
  const words = replyFor(prompt).split(' ');
  const timers: ReturnType<typeof setTimeout>[] = [];

  timers.push(setTimeout(() => emit('lifecycle', { state: 'planning' }), 120));
  timers.push(setTimeout(() => emit('lifecycle', { state: 'executing' }), 320));

  let delay = 500;
  words.forEach((word, i) => {
    timers.push(
      setTimeout(() => {
        emit('token', { value: (i === 0 ? '' : ' ') + word });
      }, delay),
    );
    delay += 45 + Math.random() * 40;
  });

  timers.push(
    setTimeout(() => {
      emit('lifecycle', { state: 'completed' });
      emit('done', { messageId: `a-${Date.now()}` });
    }, delay + 60),
  );

  return () => timers.forEach(clearTimeout);
};
