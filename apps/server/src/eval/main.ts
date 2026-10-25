import { createDeepSeek } from '@ai-sdk/deepseek';
import type { AppUIMessage } from '@app/shared';
import {
  getToolName,
  isToolUIPart,
  type LanguageModel,
  readUIMessageStream,
} from 'ai';
import { streamChat } from '../agent';
import { buildInstructions } from '../agent/instructions';
import type { ToolContext } from '../agent/tools';
import { loadConfig } from '../config';
import { buildNationalKpis } from '../kpis/airport-kpis';
import { loadSnapshot } from '../snapshot/load';
import { groundingPromptText, ungroundedNumbers } from './grounding';

type Call = { name: string; input: Record<string, unknown> };

const has = (c: Call, name: string, key: string, value: unknown) =>
  c.name === name && c.input[key] === value;

// The four questions from docs/assignment.md; every data tool call must match the case.
const CASES: { question: string; routed: (c: Call) => boolean }[] = [
  {
    question:
      'Which airports in New England are strong candidates for terminal expansion?',
    routed: (c) => has(c, 'rankExpansionCandidates', 'region', 'New England'),
  },
  {
    question: 'Compare LA and Santa Ana airport congestion levels.',
    routed: (c) =>
      c.name === 'compareCongestion' &&
      Array.isArray(c.input.airports) &&
      [...c.input.airports].sort().join() === 'LAX,SNA',
  },
  {
    question:
      'What is the percentage of long haul flights out of Anchorage airport?',
    routed: (c) => has(c, 'getLongHaulShare', 'iata', 'ANC'),
  },
  {
    question: 'What is the unmet flight demand in SFO airport and why?',
    routed: (c) => has(c, 'estimateUnmetDemand', 'iata', 'SFO'),
  },
];

/** Runs one question through the chat path; resolves to a FAIL reason or the final message. */
const ask = async (model: LanguageModel, ctx: ToolContext, text: string) => {
  const user: AppUIMessage = {
    id: 'q',
    role: 'user',
    parts: [{ type: 'text', text }],
  };
  const stream = await streamChat(model, ctx, [user]);
  if (stream.isErr()) return { error: stream.error.message };
  const errors: string[] = [];
  let last: AppUIMessage | undefined;
  for await (const message of readUIMessageStream<AppUIMessage>({
    stream: stream.value,
    onError: (e) => errors.push(e instanceof Error ? e.message : String(e)),
  }))
    last = message;
  if (errors.length > 0) return { error: errors.join('; ') };
  if (!last) return { error: 'no assistant message' };
  return { message: last };
};

const run = async (model: LanguageModel, ctx: ToolContext) => {
  const instructions = groundingPromptText(buildInstructions(ctx));
  let failed = false;
  for (const [i, { question, routed }] of CASES.entries()) {
    const label = `Q${i + 1}`;
    const result = await ask(model, ctx, question).catch((e: unknown) => ({
      error: e instanceof Error ? e.message : String(e),
    }));
    if ('error' in result) {
      failed = true;
      console.log(`FAIL ${label} error: ${result.error}`);
      continue;
    }
    const parts = result.message.parts;
    const answer = parts.flatMap((p) => (p.type === 'text' ? [p.text] : []));
    const tools = parts.filter(isToolUIPart);
    const calls = tools.map((p) => ({
      name: getToolName(p),
      input: (p.input ?? {}) as Record<string, unknown>,
      output: p.state === 'output-available' ? p.output : p.errorText,
    }));
    // suggestFollowUps output is model-written, so it neither routes nor grounds a number.
    const data = calls.filter((c) => c.name !== 'suggestFollowUps');
    const ungrounded = ungroundedNumbers(answer.join('\n'), [
      ...data.map((c) => JSON.stringify(c.output)),
      instructions,
      question,
    ]);
    const routeOk = data.length > 0 && data.every(routed);
    const ok = routeOk && ungrounded.length === 0 && answer.length > 0;
    if (!ok) failed = true;
    const called = calls.map((c) => `${c.name}(${JSON.stringify(c.input)})`);
    console.log(
      [
        `${ok ? 'PASS' : 'FAIL'} ${label}`,
        `routing ${routeOk ? 'ok' : 'WRONG'}`,
        `tools: ${called.join(', ') || 'none'}`,
        `ungrounded: ${ungrounded.join(', ') || 'none'}`,
        ...(answer.length === 0 ? ['no answer text'] : []),
      ].join(' | '),
    );
  }
  process.exit(failed ? 1 : 0);
};

loadConfig(process.env)
  .andThen((config) =>
    loadSnapshot()
      .map((snapshot) => ({
        config,
        ctx: { snapshot, kpis: buildNationalKpis(snapshot) },
      }))
      .mapErr(
        (error) =>
          `Airport data snapshot failed to load: ${error.message}. Run \`pnpm ingest\` to build it.`,
      ),
  )
  .match(
    ({ config, ctx }) =>
      run(
        createDeepSeek({ apiKey: config.DEEPSEEK_API_KEY })(
          config.DEEPSEEK_MODEL,
        ),
        ctx,
      ),
    (message) => {
      console.error(message);
      process.exit(1);
    },
  );
