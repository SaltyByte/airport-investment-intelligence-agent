import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { cn } from 'cn';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { Markdown } from '@/components/markdown';
import {
  ResultData,
  ResultHeading,
  ResultMethod,
  readPart,
  ScaleBar,
  TitleBlock,
} from '@/components/result-card';
import { formatValue } from '@/components/result-format';

type ToolPart = ToolUIPart | DynamicToolUIPart;

const sheet = 'rounded-lg border bg-card';

// The deciding airport's drivers, national percentiles on the same true 0–100 scale.
function Drivers({
  drivers,
}: {
  drivers: { label: string; value: number | null }[];
}) {
  return (
    <dl className="grid grid-cols-3 gap-x-4 gap-y-3 self-start lg:grid-cols-1">
      {drivers.map((d) => (
        // Bottom-aligned so bars line up when a label wraps; label beside the value only on desktop.
        <div
          key={d.label}
          className="flex min-w-0 flex-col justify-end gap-1 lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between"
        >
          <dt className="hyphens-auto font-medium text-muted-foreground text-xs leading-4">
            {d.label}
          </dt>
          <dd className="font-semibold text-sm tabular-nums">
            {d.value === null ? (
              <>
                <span aria-hidden>—</span>
                <span className="sr-only">not available</span>
              </>
            ) : (
              formatValue(d.value, 'percentile').text
            )}
          </dd>
          <dd className="lg:basis-full">
            <ScaleBar value={d.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * One assistant answer: a title block per tool result, then Why / Ranking or Data / Method.
 * An answer with no tool results is a plain prose sheet.
 */
export function AnswerSheet({
  text,
  parts,
  pending,
}: {
  text: string;
  parts: ToolPart[];
  pending: boolean;
}) {
  const id = useId();
  const [tab, setTab] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const reads = parts.flatMap((p) => {
    const read = readPart(p);
    return read ? [{ key: p.toolCallId, read }] : [];
  });
  const ok = reads.flatMap(({ key, read }) =>
    read.kind === 'ok' ? [{ key, ...read }] : [],
  );
  // ~70 characters a line in Public Sans at 16px.
  const prose = (
    <div className="min-w-0 max-w-[34rem]">
      {text ? (
        <Markdown text={text} />
      ) : (
        <p className="text-muted-foreground">
          {pending ? 'Writing the answer…' : 'No written answer came back.'}
        </p>
      )}
    </div>
  );

  if (reads.length === 0)
    return text ? (
      <div className={cn(sheet, 'px-4 py-4 sm:px-6')}>{prose}</div>
    ) : null;

  const titleBlocks = (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {reads.map(({ key, read }) => (
        <TitleBlock key={key} read={read} />
      ))}
    </div>
  );

  // Nothing to tab between (still loading, or every lookup failed): the prose follows the blocks.
  if (ok.length === 0)
    return (
      <div className={sheet}>
        {titleBlocks}
        <div className="px-4 pt-2 pb-5 sm:px-6">{prose}</div>
      </div>
    );

  const tabs = [
    'Why',
    ok.some((o) => o.sheet.tab === 'Ranking') ? 'Ranking' : 'Data',
    'Method',
  ];
  const drivers = ok.find((o) => o.sheet.headline?.drivers?.length)?.sheet
    .headline?.drivers;
  const several = ok.length > 1;

  // ARIA tabs: roving tabindex, ←/→ wrap, Home/End jump.
  const onKey = (e: KeyboardEvent) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? tab === last
          ? 0
          : tab + 1
        : e.key === 'ArrowLeft'
          ? tab === 0
            ? last
            : tab - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setTab(next);
    tabsRef.current
      ?.querySelectorAll<HTMLElement>('[role="tab"]')
      [next]?.focus();
  };

  return (
    <div className={sheet}>
      {titleBlocks}
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Answer detail"
        onKeyDown={onKey}
        className="flex gap-1 border-b px-1 sm:px-2"
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            id={`${id}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={tab === i}
            aria-controls={`${id}-panel`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            className={cn(
              '-mb-px min-h-11 border-b-2 px-3 font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              tab === i
                ? 'border-drafting text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${tab}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: APG tabpanel takes focus when its content may not
        tabIndex={0}
        className="rounded-b-lg px-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6"
      >
        {tab === 0 && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,34rem)_minmax(12rem,16rem)] lg:justify-between lg:gap-10">
            {drivers && (
              <div className="lg:order-last">
                <Drivers drivers={drivers} />
              </div>
            )}
            {prose}
          </div>
        )}
        {tab === 1 && (
          <div className="flex flex-col gap-8">
            {ok.map((o) => (
              <section key={o.key} className="flex flex-col gap-3">
                {several && <ResultHeading>{o.result.title}</ResultHeading>}
                <ResultData r={o.result} s={o.sheet} />
              </section>
            ))}
          </div>
        )}
        {tab === 2 && (
          <div className="flex flex-col gap-8">
            {ok.map((o) => (
              <section key={o.key} className="flex flex-col gap-3">
                {several && <ResultHeading>{o.result.title}</ResultHeading>}
                <ResultMethod r={o.result} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
