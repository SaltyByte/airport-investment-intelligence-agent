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
import { tools } from './tools';

const INSTRUCTIONS = `You are an airport investment research assistant.
Scope: US airports only; politely decline anything else.
Use the getAirport tool to look up airports. When a lookup fails or data is missing, say in plain words that the data is unavailable and give the reason in everyday language (for example, "I don't have data for that airport yet").
Never mention internal field names, flags, error codes or tool names in your answer; the interface already shows the tool result as a card.
Never invent figures, names or dates; only state values returned by tools, citing their source and as-of date.`;

const invalidInput = (message: string): AppError => ({
  kind: 'InvalidInput',
  message,
});

/** Validates client-held UI messages and starts a streamed, tool-calling reply. */
export const streamChat = (model: LanguageModel, messages: unknown) =>
  ResultAsync.fromSafePromise(
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
          stopWhen: isStepCount(5),
        }).stream,
        onError: (error) =>
          error instanceof Error ? error.message : 'The model request failed.',
      }),
    );
