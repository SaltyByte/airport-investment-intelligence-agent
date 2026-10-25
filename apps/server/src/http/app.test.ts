import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildNationalKpis } from '../kpis/airport-kpis';
import { airport, snapshot } from '../test/fixtures';
import { createApp } from './app';

const fixture = snapshot([airport('SFO')]);
const ctx = { snapshot: fixture, kpis: buildNationalKpis(fixture) };

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
      createApp({ model: new MockLanguageModelV4(), ctx }),
    ).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/chat', () => {
  it('streams the answer text', async () => {
    const model = new MockLanguageModelV4({
      doStream: {
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 't1' },
            { type: 'text-delta', id: 't1', delta: 'SFO is in San Francisco.' },
            { type: 'text-end', id: 't1' },
            finish('stop'),
          ],
        }),
      },
    });

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(res.status).toBe(200);
    expect(res.headers['x-vercel-ai-ui-message-stream']).toBe('v1');
    expect(chunks(res.text)).toContainEqual(
      expect.objectContaining({
        type: 'text-delta',
        delta: 'SFO is in San Francisco.',
      }),
    );
  });

  it('reports a model failure as an error chunk instead of crashing', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new Error('API key not valid');
      },
    });

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(res.status).toBe(200);
    expect(chunks(res.text)).toContainEqual({
      type: 'error',
      errorText: expect.stringContaining('API key not valid'),
    });
  });

  it('caps a tool-looping model at 8 steps and forces a text-only last step', async () => {
    // Calls a tool on every step unless the SDK forbids tools, as a real provider would.
    const model = new MockLanguageModelV4({
      doStream: async ({ toolChoice }) => ({
        stream:
          toolChoice?.type === 'none'
            ? simulateReadableStream({
                chunks: [
                  { type: 'text-start', id: 't1' },
                  { type: 'text-delta', id: 't1', delta: 'Final answer.' },
                  { type: 'text-end', id: 't1' },
                  finish('stop'),
                ],
              })
            : simulateReadableStream({
                chunks: [
                  {
                    type: 'tool-call',
                    toolCallId: crypto.randomUUID(),
                    toolName: 'lookup',
                    input: '{}',
                  },
                  finish('tool-calls'),
                ],
              }),
      }),
    });

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    const calls = model.doStreamCalls;
    expect(calls).toHaveLength(8);
    expect(calls.at(-1)?.toolChoice).toEqual({ type: 'none' });
    expect(calls.slice(0, -1).map((c) => c.toolChoice?.type)).not.toContain(
      'none',
    );
    const textDeltas = chunks(res.text).filter((c) => c.type === 'text-delta');
    expect(textDeltas.at(-1)?.delta).toBe('Final answer.');
  });

  it('rejects a malformed messages body with 400 InvalidInput', async () => {
    const res = await request(
      createApp({ model: new MockLanguageModelV4(), ctx }),
    )
      .post('/api/chat')
      .send({ messages: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.kind).toBe('InvalidInput');
  });
});
