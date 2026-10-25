import { SuggestFollowUpsInput } from '@app/shared';
import { tool } from 'ai';

// Echoes the validated questions; the web app renders them as chips and the turn ends on this call.
export const suggestFollowUpsTool = tool({
  description:
    'Offers the user 2-3 follow-up questions. Call it once, as the very last action, after an answer that used tool data.',
  inputSchema: SuggestFollowUpsInput,
  outputSchema: SuggestFollowUpsInput,
  execute: async (input) => input,
});
