import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const finish = (unified: 'stop' | 'tool-calls') =>
  ({
    type: 'finish',
    finishReason: { unified, raw: undefined },
    usage,
  }) as const;

const userMessage = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'Tell me about SFO' }],
};

// Parses an SSE UI message stream body into its JSON chunks.
const chunks = (body: string) =>
  body
    .split('\n')
    .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
    .map((line) => JSON.parse(line.slice(6)));

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(
      createApp({ model: new MockLanguageModelV4() }),
    ).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/chat', () => {
  it('streams a getAirport tool output and then the answer text', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              {
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: 'getAirport',
                input: '{"iata":"SFO"}',
              },
              finish('tool-calls'),
            ],
          }),
        },
        {
          stream: simulateReadableStream({
            chunks: [
              { type: 'text-start', id: 't1' },
              {
                type: 'text-delta',
                id: 't1',
                delta: 'SFO is in San Francisco.',
              },
              { type: 'text-end', id: 't1' },
              finish('stop'),
            ],
          }),
        },
      ],
    });

    const res = await request(createApp({ model }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(res.status).toBe(200);
    expect(res.headers['x-vercel-ai-ui-message-stream']).toBe('v1');
    const parts = chunks(res.text);
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'tool-output-available',
        toolCallId: 'call-1',
        output: expect.objectContaining({
          ok: true,
          airport: expect.objectContaining({ iata: 'SFO' }),
        }),
      }),
    );
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'text-delta',
        delta: 'SFO is in San Francisco.',
      }),
    );
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('reports a model failure as an error chunk instead of crashing', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error('API key not valid');
      },
    });

    const res = await request(createApp({ model }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(res.status).toBe(200);
    expect(chunks(res.text)).toContainEqual({
      type: 'error',
      errorText: expect.stringContaining('API key not valid'),
    });
  });

  it('rejects a malformed messages body with 400 InvalidInput', async () => {
    const res = await request(createApp({ model: new MockLanguageModelV4() }))
      .post('/api/chat')
      .send({ messages: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.kind).toBe('InvalidInput');
  });
});
