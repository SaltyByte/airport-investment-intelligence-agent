import { z } from 'zod';

export const SuggestFollowUpsInput = z.object({
  questions: z
    .array(z.string().trim().min(1).max(120))
    .min(2)
    .max(3)
    .describe('2-3 short, self-contained follow-up questions.'),
});
export type SuggestFollowUpsInput = z.infer<typeof SuggestFollowUpsInput>;
