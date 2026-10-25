import type { AppError, AppUIMessage } from '@app/shared';
import {
  convertToModelMessages,
  isStepCount,
  type LanguageModel,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from 'ai';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { buildInstructions, MAX_STEPS } from './instructions';
import { createTools, type ToolContext } from './tools';

const invalidInput = (message: string): AppError => ({
  kind: 'InvalidInput',
  message,
});

export const streamChat = (
  model: LanguageModel,
  ctx: ToolContext,
  messages: unknown,
) => {
  const tools = createTools(ctx);
  return ResultAsync.fromSafePromise(
    safeValidateUIMessages<AppUIMessage>({ messages, tools }),
  )
    .andThen((validated) =>
      validated.success
        ? okAsync(validated.data)
        : errAsync(invalidInput(validated.error.message)),
    )
    .andThen((uiMessages) =>
      ResultAsync.fromPromise(
        convertToModelMessages(uiMessages, { tools }),
        (error) => invalidInput(String(error)),
      ),
    )
    .map((modelMessages) =>
      toUIMessageStream({
        stream: streamText({
          model,
          instructions: buildInstructions(ctx),
          messages: modelMessages,
          tools,
          stopWhen: [
            isStepCount(MAX_STEPS),
            ({ steps }) => {
              const isSuggest = (c: { toolName: string }) =>
                c.toolName === 'suggestFollowUps';
              const calls = steps.at(-1)?.toolCalls ?? [];
              const lastData = steps.findLastIndex((s) =>
                s.toolCalls.some((c) => !isSuggest(c)),
              );
              return (
                calls.length > 0 &&
                calls.every(isSuggest) &&
                steps.slice(lastData + 1).some((s) => s.text.trim() !== '')
              );
            },
          ],
          prepareStep: ({ stepNumber }) =>
            stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : undefined,
        }).stream,
        onError: (error) =>
          error instanceof Error ? error.message : 'The model request failed.',
      }),
    );
};
