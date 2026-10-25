import {
  type ToolMetric,
  ToolResult,
  type ToolSuccess,
  type ToolUnit,
} from '@app/shared';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { cn } from 'cn';
import { CircleAlert, TriangleAlert } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  errorCopy,
  formatValue,
  onScale,
  ordinalPct,
  type Sheet,
  type SheetColumn,
  toSheet,
} from './result-format';

type ToolPart = ToolUIPart | DynamicToolUIPart;
type Row = NonNullable<Sheet['table']>['rows'][number];

type ReadPart =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'ok'; result: ToolSuccess; sheet: Sheet };

// Every tool output shares the ToolResult contract; anything else reads as unavailable.
export function readPart(part: ToolPart): ReadPart | null {
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return { kind: 'loading' };
    case 'output-error':
      return {
        kind: 'unavailable',
        reason: 'This lookup did not finish. Try asking again.',
      };
    case 'output-available': {
      const parsed = ToolResult.safeParse(part.output);
      if (!parsed.success)
        return {
          kind: 'unavailable',
          reason: 'The result came back in a form this page cannot show.',
        };
      if (!parsed.data.ok)
        return {
          kind: 'unavailable',
          reason: errorCopy(parsed.data.error.kind),
        };
      return {
        kind: 'ok',
        result: parsed.data,
        sheet: toSheet(parsed.data),
      };
    }
    default:
      return null;
  }
}

function CodeSign({ code, large = false }: { code: string; large?: boolean }) {
  // Airfield location sign: yellow letters on a black field with a thin yellow inset border.
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-sign font-semibold text-highlight tracking-wide ring-1 ring-highlight ring-inset',
        large ? 'h-12 min-w-20 px-3 text-2xl' : 'h-7 min-w-14 px-2 text-sm',
      )}
    >
      {code}
    </span>
  );
}

const label = 'font-medium text-muted-foreground text-xs leading-4';

// A true 0–100 scale with ticks at 25/50/75. Solid ink is observed, dashed blue is estimate.
export function ScaleBar({
  value,
  estimate = false,
  thick = false,
}: {
  value: number | null;
  estimate?: boolean;
  thick?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative mb-1 block w-full bg-secondary',
        thick ? 'h-2.5' : 'h-1.5',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 start-0',
          estimate ? 'border border-drafting border-dashed' : 'bg-foreground',
        )}
        style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
      />
      {[25, 50, 75].map((t) => (
        <span
          key={t}
          className="absolute top-full h-1 w-px bg-border"
          style={{ insetInlineStart: `${t}%` }}
        />
      ))}
    </span>
  );
}

// Abbreviated units ("mi", "min") and the null dash get a spoken form. Estimates draw dashed
// blue; `tag` adds "est." unless a column header already carries it.
function Value({
  value,
  unit,
  estimate = false,
  tag = true,
}: {
  value: string | number | null;
  unit: ToolUnit | undefined;
  estimate?: boolean;
  tag?: boolean;
}) {
  const { text, spoken } = formatValue(value, unit);
  const shown =
    text === spoken ? (
      text
    ) : (
      <>
        <span aria-hidden>{text}</span>
        <span className="sr-only">{spoken}</span>
      </>
    );
  if (!estimate || value === null) return shown;
  return (
    <>
      <span className="text-drafting underline decoration-dashed decoration-1 underline-offset-4">
        {shown}
      </span>
      {tag && (
        <>
          {' '}
          <span className="font-medium text-drafting text-xs">
            <span aria-hidden>est.</span>
            <span className="sr-only">estimate</span>
          </span>
        </>
      )}
    </>
  );
}

function CaveatBadge({ text }: { text: string }) {
  return (
    <p className="inline-flex items-start gap-1.5 self-start border border-foreground px-2 py-1 font-medium text-xs leading-4">
      <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
      <span>
        <span className="sr-only">Caveat: </span>
        {text}
      </span>
    </p>
  );
}

function generatedText(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

// Cells sit on a grid-grey ground with 1px gaps, so the rules survive any wrap. Every row of the
// block shares one two-track template, so its vertical rules line up from top to bottom.
const cells = 'grid gap-px bg-border';
const cell = 'flex min-w-0 flex-col gap-1 bg-card px-4 py-3';
const tracks = 'sm:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)]';

// Source and period sit under the airport cell; generated and computed under the number cell.
// A phone keeps only the computed line; the rest is in the Method tab.
function Provenance({ r }: { r: ToolSuccess }) {
  return (
    <>
      <dl className={cn(cells, 'hidden sm:grid sm:grid-cols-2')}>
        <div className={cell}>
          <dt className={label}>Source</dt>
          <dd className="text-xs leading-4">{r.source}</dd>
        </div>
        <div className={cell}>
          <dt className={label}>Period</dt>
          <dd className="text-xs leading-4">{r.period}</dd>
        </div>
      </dl>
      <dl className={cn(cells, 'sm:grid-cols-[auto_minmax(0,1fr)]')}>
        <div className={cn(cell, 'hidden sm:flex')}>
          <dt className={label}>Generated</dt>
          <dd className="text-xs leading-4 tabular-nums">
            <time dateTime={r.generatedAt}>{generatedText(r.generatedAt)}</time>
          </dd>
        </div>
        <div className={cn(cell, 'justify-center')}>
          <dt className="sr-only">Computed</dt>
          <dd className="text-xs leading-4">
            Computed by deterministic scoring
          </dd>
        </div>
      </dl>
    </>
  );
}

const block = 'border border-foreground bg-border';

function Success({ r, s }: { r: ToolSuccess; s: Sheet }) {
  const h = s.headline;
  return (
    <section
      aria-label={h ? `${h.label}: ${h.name}` : r.title}
      className={cn(block, cells, tracks)}
    >
      <div className={cn(cell, 'gap-2 py-4', !h && 'sm:col-span-full')}>
        {h ? (
          <div className="flex items-center gap-3">
            <CodeSign code={h.iata} large />
            <div className="min-w-0">
              <h3 className="text-balance font-semibold text-lg leading-6">
                {h.name}
              </h3>
              <p className="text-muted-foreground text-sm leading-5">
                {h.context}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-balance font-semibold text-lg leading-6">
              {r.title}
            </h3>
            {s.caveatBadge && <CaveatBadge text={s.caveatBadge} />}
          </>
        )}
      </div>
      {h && (
        <div className={cn(cell, 'gap-2 py-4')}>
          <p className={label}>{h.label}</p>
          <p className="font-semibold text-[2.5rem] leading-[2.75rem] tabular-nums">
            <Value value={h.value} unit={h.unit} estimate={h.estimate} />
          </p>
          {h.bar && <ScaleBar value={h.value} estimate={h.estimate} thick />}
          {s.caveatBadge && (
            <div className="pt-1">
              <CaveatBadge text={s.caveatBadge} />
            </div>
          )}
        </div>
      )}
      <Provenance r={r} />
    </section>
  );
}

function Unavailable({ reason }: { reason: string }) {
  return (
    <section aria-label="Data unavailable" className={cn(block, cells)}>
      <div className={cn(cell, 'gap-1 py-4')}>
        <h3 className="flex items-center gap-2 font-semibold text-lg leading-6">
          <CircleAlert aria-hidden className="size-5 text-destructive" />
          Data unavailable
        </h3>
        <p className="text-muted-foreground text-sm leading-5">{reason}</p>
      </div>
    </section>
  );
}

function Skel({ className }: { className: string }) {
  return <span aria-hidden className={cn('skeleton block', className)} />;
}

// Same cell geometry as a loaded block, so the swap moves little; the status text stays readable.
function Loading() {
  return (
    <section
      aria-busy
      aria-label="Gathering data"
      className={cn(block, cells, tracks)}
    >
      <div className={cn(cell, 'flex-row items-center gap-3 py-4')}>
        <Skel className="h-12 w-20 rounded-md" />
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm leading-5">
            Gathering data
          </p>
          <Skel className="h-3 w-40" />
        </div>
      </div>
      <div className={cn(cell, 'gap-2 py-4')}>
        <Skel className="h-3 w-24" />
        <Skel className="h-11 w-28" />
        <Skel className="mb-1 h-2.5 w-full" />
      </div>
      <div className={cn(cell, 'hidden sm:flex')}>
        <Skel className="h-3 w-40" />
      </div>
      <div className={cell}>
        <Skel className="h-3 w-32" />
      </div>
    </section>
  );
}

export function TitleBlock({ read }: { read: ReadPart }) {
  if (read.kind === 'loading') return <Loading />;
  if (read.kind === 'unavailable') return <Unavailable reason={read.reason} />;
  return <Success r={read.result} s={read.sheet} />;
}

function Metric({ m }: { m: ToolMetric }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={label}>{m.label}</dt>
      <dd className="font-semibold text-lg tabular-nums">
        <Value value={m.value} unit={m.unit} estimate={m.estimate} />
      </dd>
      {m.percentile != null && (
        <dd className="text-muted-foreground text-xs leading-4 tabular-nums">
          {ordinalPct(m.percentile)}
        </dd>
      )}
      {m.note && (
        <dd className="text-muted-foreground text-xs leading-4">{m.note}</dd>
      )}
    </div>
  );
}

function AirportCell({ col, row }: { col: SheetColumn; row: Row }) {
  const code = row[col.key];
  const name = col.kind === 'airport' && col.nameKey ? row[col.nameKey] : null;
  return (
    <span className="flex items-center gap-2.5">
      {typeof code === 'string' ? (
        <CodeSign code={code} />
      ) : (
        <Value value={code ?? null} unit={undefined} />
      )}
      {typeof name === 'string' && <span className="font-medium">{name}</span>}
    </span>
  );
}

function ColLabel({ col }: { col: SheetColumn }) {
  return (
    <>
      {col.label}
      {col.kind === 'value' && col.estimate && (
        <span className="text-drafting">
          {' '}
          <span aria-hidden>est.</span>
          <span className="sr-only">estimate</span>
        </span>
      )}
    </>
  );
}

function Cell({ col, row }: { col: SheetColumn; row: Row }) {
  if (col.kind === 'airport') return <AirportCell col={col} row={row} />;
  return (
    <Value
      value={row[col.key] ?? null}
      unit={col.unit}
      estimate={col.estimate}
      tag={false}
    />
  );
}

// The deciding column: the first one on a 0–100 scale gets a true-length bar.
const leadOf = (cols: SheetColumn[]) =>
  cols.find(
    (c): c is Extract<SheetColumn, { kind: 'value' }> =>
      c.kind === 'value' && onScale(c.unit),
  );

// The airport cell stays in view while the other columns scroll under it; its grid-grey right
// rule marks where they disappear.
const sticky = 'sticky start-0 z-10 border-e bg-card';

function Table({
  title,
  cols,
  rows,
}: {
  title: string;
  cols: SheetColumn[];
  rows: Row[];
}) {
  const lead = leadOf(cols);
  const boxRef = useRef<HTMLElement>(null);
  const [scrolls, setScrolls] = useState(false);
  // The region takes a tab stop only while it actually scrolls sideways.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const check = () => setScrolls(box.scrollWidth > box.clientWidth);
    const observer = new ResizeObserver(check);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    return () => observer.disconnect();
  }, []);
  return (
    // Wide (All metrics) tables scroll inside their own box; the page never scrolls sideways.
    <section
      ref={boxRef}
      aria-label={`${title} table`}
      // A scrollable region must be keyboard-scrollable; it takes a tab stop only when it scrolls.
      tabIndex={scrolls ? 0 : undefined}
      // `relative` keeps the absolutely positioned sr-only spoken forms inside the scroll box.
      className="relative hidden overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
    >
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr className="border-foreground border-b">
            {cols.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  label,
                  'py-2 pe-4 align-bottom',
                  c.kind === 'value' && c.numeric ? 'text-end' : 'text-start',
                  c.kind === 'airport' && sticky,
                )}
              >
                <ColLabel col={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id and never reorder
            <tr key={r} className="border-b last:border-b-0">
              {cols.map((c) => {
                const Tag = c.kind === 'airport' ? 'th' : 'td';
                return (
                  <Tag
                    key={c.key}
                    scope={c.kind === 'airport' ? 'row' : undefined}
                    className={cn(
                      'py-2 pe-4 align-middle font-normal',
                      c.kind === 'airport'
                        ? cn('min-w-56 text-start', sticky)
                        : c.numeric
                          ? 'text-end whitespace-nowrap'
                          : 'min-w-32 text-start',
                    )}
                  >
                    {c === lead ? (
                      <span className="ms-auto flex w-40 items-center gap-3">
                        <ScaleBar
                          value={row[c.key] as number | null}
                          estimate={lead.estimate}
                        />
                        <span className="w-10 shrink-0 font-semibold">
                          <Cell col={c} row={row} />
                        </span>
                      </span>
                    ) : (
                      <Cell col={c} row={row} />
                    )}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Phone: one stacked row per airport. Unitless numbers before the airport (rank) lead the
// line; the deciding column gets a bar; the rest sit in a 3-up grid. No sideways scroll.
function Rows({ cols, rows }: { cols: SheetColumn[]; rows: Row[] }) {
  const lead = leadOf(cols);
  const airportAt = cols.findIndex((c) => c.kind === 'airport');
  const head = cols.filter(
    (c, i) =>
      c.kind === 'airport' || (i < airportAt && c.kind === 'value' && !c.unit),
  );
  const rest = cols.filter((c) => c !== lead && !head.includes(c));
  return (
    <ul className="flex flex-col text-sm tabular-nums sm:hidden">
      {rows.map((row, r) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id and never reorder
          key={r}
          className="flex flex-col gap-2 border-b py-3 last:border-b-0"
        >
          <div className="flex items-center gap-2.5">
            {head.map((c) =>
              c.kind === 'airport' ? (
                <AirportCell key={c.key} col={c} row={row} />
              ) : (
                <span
                  key={c.key}
                  className="w-5 shrink-0 text-muted-foreground"
                >
                  <span className="sr-only">{c.label} </span>
                  <Cell col={c} row={row} />
                </span>
              ),
            )}
          </div>
          {lead && (
            <div className="flex flex-col">
              <span className={label}>
                <ColLabel col={lead} />
              </span>
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 font-semibold text-lg">
                  <Cell col={lead} row={row} />
                </span>
                <ScaleBar
                  value={row[lead.key] as number | null}
                  estimate={lead.estimate}
                  thick
                />
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
              {rest.map((c) => (
                <div key={c.key} className="flex min-w-0 flex-col">
                  <dt className={cn(label, 'wrap-break-word')}>
                    <ColLabel col={c} />
                  </dt>
                  <dd>
                    <Cell col={c} row={row} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Ranking/Data tab body for one result: metrics, key columns, and the All metrics disclosure. */
export function ResultData({ r, s }: { r: ToolSuccess; s: Sheet }) {
  const [all, setAll] = useState(false);
  const id = useId();
  const t = s.table;
  const cols = t && (all ? t.all : t.key);
  return (
    <div className="flex flex-col gap-4">
      {r.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {r.metrics.map((m) => (
            <Metric key={m.label} m={m} />
          ))}
        </dl>
      )}
      {t && cols && (
        <div id={id}>
          <Table title={r.title} cols={cols} rows={t.rows} />
          <Rows cols={cols} rows={t.rows} />
        </div>
      )}
      {t?.hasMore && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={id}
          onClick={() => setAll(!all)}
          className="inline-flex min-h-11 items-center self-start rounded-md border border-foreground px-4 font-medium text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {all ? 'Key metrics only' : 'All metrics'}
        </button>
      )}
    </div>
  );
}

function List({
  title,
  items,
}: {
  title: string;
  items: string[] | undefined;
}) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <ul className="list-disc ps-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Method tab body for one result: where the numbers come from and what limits them. */
export function ResultMethod({ r }: { r: ToolSuccess }) {
  return (
    <div className="flex max-w-[32rem] flex-col gap-4 text-sm leading-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">Source</dt>
        <dd>{r.source}</dd>
        <dt className="font-semibold">Period</dt>
        <dd>{r.period}</dd>
        <dt className="font-semibold">Generated</dt>
        <dd className="tabular-nums">
          <time dateTime={r.generatedAt}>{generatedText(r.generatedAt)}</time>
        </dd>
      </dl>
      <List title="Assumptions" items={r.assumptions} />
      <List title="Caveats" items={r.caveats} />
      <List title="Notes" items={r.notes} />
    </div>
  );
}

export function ResultHeading({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-sm leading-5">{children}</h3>;
}
