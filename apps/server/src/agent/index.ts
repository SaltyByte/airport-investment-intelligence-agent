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
import { INSTRUCTIONS, MAX_STEPS } from './instructions';
import { createTools, type ToolContext } from './tools';

const invalidInput = (message: string): AppError => ({
  kind: 'InvalidInput',
  message,
});

/** Validates client-held UI messages and starts a streamed, tool-calling reply. */
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
          instructions: INSTRUCTIONS,
          messages: modelMessages,
          tools,
          stopWhen: [
            isStepCount(MAX_STEPS),
            // End on a suggestFollowUps-only step, and only when answer text came after the last data
            // tool call, so a preamble or an early call cannot swallow the answer.
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
          // The last allowed step may not call tools, so the reply always ends in text.
          prepareStep: ({ stepNumber }) =>
            stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : undefined,
        }).stream,
        onError: (error) =>
          error instanceof Error ? error.message : 'The model request failed.',
      }),
    );
};
