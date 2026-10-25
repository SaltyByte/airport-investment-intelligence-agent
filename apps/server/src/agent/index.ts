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
          stopWhen: isStepCount(MAX_STEPS),
          // The last allowed step may not call tools, so the reply always ends in text.
          prepareStep: ({ stepNumber }) =>
            stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : undefined,
        }).stream,
        onError: (error) =>
          error instanceof Error ? error.message : 'The model request failed.',
      }),
    );
};
