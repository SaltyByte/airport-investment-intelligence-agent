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

  // Text chunks then the given tool calls, as one model step.
  const QUESTIONS = [
    'What is the long-haul share at Fairbanks (FAI)?',
    'How congested is Anchorage (ANC) compared with Seattle (SEA)?',
  ];
  const TOOL_INPUTS: Record<string, unknown> = {
    suggestFollowUps: { questions: QUESTIONS },
    getLongHaulShare: { iata: 'SFO' },
  };
  const step = (text: string | null, toolNames: string[]) =>
    simulateReadableStream({
      chunks: [
        ...(text === null
          ? []
          : ([
              { type: 'text-start', id: 't1' },
              { type: 'text-delta', id: 't1', delta: text },
              { type: 'text-end', id: 't1' },
            ] as const)),
        ...toolNames.map(
          (toolName) =>
            ({
              type: 'tool-call',
              toolCallId: crypto.randomUUID(),
              toolName,
              input: JSON.stringify(TOOL_INPUTS[toolName]),
            }) as const,
        ),
        finish(toolNames.length > 0 ? 'tool-calls' : 'stop'),
      ],
    });
  // Plays the given [text, toolNames] steps in order, then plain text for any extra call.
  const scripted = (...steps: [string | null, string[]][]) => {
    let i = 0;
    return new MockLanguageModelV4({
      doStream: async () => ({
        stream: step(...(steps[i++] ?? ['Extra step.', []])),
      }),
    });
  };
  const textDeltas = (body: string) =>
    chunks(body)
      .filter((c) => c.type === 'text-delta')
      .map((c) => c.delta);

  it('ends the turn when suggestFollowUps follows the answer text', async () => {
    const model = scripted(['ANC is 12.3% long-haul.', ['suggestFollowUps']]);

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(model.doStreamCalls).toHaveLength(1);
    const body = chunks(res.text);
    expect(body).toContainEqual(
      expect.objectContaining({
        type: 'text-delta',
        delta: 'ANC is 12.3% long-haul.',
      }),
    );
    expect(body).toContainEqual(
      expect.objectContaining({
        type: 'tool-input-available',
        toolName: 'suggestFollowUps',
      }),
    );
    expect(body).toContainEqual(
      expect.objectContaining({
        type: 'tool-output-available',
        output: { questions: QUESTIONS },
      }),
    );
  });

  it('keeps going when suggestFollowUps comes before any answer text', async () => {
    const model = scripted(
      [null, ['suggestFollowUps']],
      ['ANC is 12.3% long-haul.', ['suggestFollowUps']],
    );

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(model.doStreamCalls).toHaveLength(2);
    expect(chunks(res.text)).toContainEqual(
      expect.objectContaining({
        type: 'text-delta',
        delta: 'ANC is 12.3% long-haul.',
      }),
    );
  });

  it('keeps going when a preamble, a data tool and suggestFollowUps share one step', async () => {
    const model = scripted(
      ['Let me look that up.', ['getLongHaulShare', 'suggestFollowUps']],
      ['SFO is 30.1% long-haul.', ['suggestFollowUps']],
    );

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(model.doStreamCalls).toHaveLength(2);
    expect(textDeltas(res.text)).toContain('SFO is 30.1% long-haul.');
  });

  it('keeps going when a bare suggestFollowUps follows a preamble and data tool', async () => {
    const model = scripted(
      ['Let me look that up.', ['getLongHaulShare']],
      [null, ['suggestFollowUps']],
      ['SFO is 30.1% long-haul.', ['suggestFollowUps']],
    );

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages: [userMessage] });

    expect(model.doStreamCalls).toHaveLength(3);
    expect(textDeltas(res.text)).toContain('SFO is 30.1% long-haul.');
  });

  it('passes earlier turns, tool call and result included, to the model', async () => {
    const model = scripted(['FAI answer.', []]);
    const toolOutput = {
      ok: true,
      title: 'Long-haul share of departures — ANC',
      metrics: [],
    };
    const messages = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Long-haul share at Anchorage?' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          {
            type: 'tool-getLongHaulShare',
            toolCallId: 'call-1',
            state: 'output-available',
            input: { iata: 'ANC' },
            output: toolOutput,
          },
          { type: 'step-start' },
          { type: 'text', text: 'ANC is 12.3% long-haul.', state: 'done' },
        ],
      },
      {
        id: 'u2',
        role: 'user',
        parts: [
          { type: 'text', text: 'And how does that compare with Fairbanks?' },
        ],
      },
    ];

    const res = await request(createApp({ model, ctx }))
      .post('/api/chat')
      .send({ messages });

    expect(res.status).toBe(200);
    const prompt = model.doStreamCalls[0]?.prompt ?? [];
    const parts = prompt.flatMap((m): unknown[] =>
      typeof m.content === 'string' ? [] : [...m.content],
    );
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'tool-call',
        toolCallId: 'call-1',
        toolName: 'getLongHaulShare',
        input: { iata: 'ANC' },
      }),
    );
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: 'tool-result',
        toolCallId: 'call-1',
        output: { type: 'json', value: toolOutput },
      }),
    );
    expect(JSON.stringify(prompt)).toContain('Fairbanks');
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
