import { ToolResult, type ToolSuccess, type ToolUnit } from '@app/shared';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { errorCopy, formatValue, ordinalPct } from './result-format';

function CodeSign({ code }: { code: string }) {
  // Styled after an airfield location sign: yellow letters on a black field.
  return (
    <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-sm bg-foreground px-2 font-semibold text-highlight tracking-wide ring-1 ring-highlight ring-inset">
      {code}
    </span>
  );
}

// Abbreviated units ("mi", "min") and the null dash get a spoken form; IATA codes get the sign.
function Value({
  value,
  unit,
  sign = false,
}: {
  value: string | number | null;
  unit: ToolUnit | undefined;
  sign?: boolean;
}) {
  if (sign && typeof value === 'string') return <CodeSign code={value} />;
  const { text, spoken } = formatValue(value, unit);
  if (text === spoken) return text;
  return (
    <>
      <span aria-hidden>{text}</span>
      <span className="sr-only">{spoken}</span>
    </>
  );
}

function Unavailable({ reason }: { reason: string }) {
  return (
    <Card className="gap-2 py-4 shadow-none">
      <CardHeader className="flex items-center gap-2 px-4">
        <CircleAlert aria-hidden className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm">Data unavailable</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-muted-foreground text-sm">
        {reason}
      </CardContent>
    </Card>
  );
}

function FootList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="list-disc ps-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultTable({
  title,
  table,
}: {
  title: string;
  table: NonNullable<ToolSuccess['table']>;
}) {
  const numeric = table.columns.map(
    (col) =>
      col.unit !== undefined ||
      table.rows.some((r) => typeof r[col.key] === 'number'),
  );
  return (
    // Wide tables scroll inside the card; the page never scrolls sideways.
    <section
      aria-label={`${title} table`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-scrollable
      tabIndex={0}
      className="relative overflow-x-auto rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <table className="w-full text-start text-sm tabular-nums">
        <caption className="sr-only">{title}</caption>
        <thead className="text-muted-foreground">
          <tr className="border-b">
            {table.columns.map((col, i) => (
              <th
                key={col.key}
                scope="col"
                className={`py-1.5 pe-4 align-bottom font-medium ${numeric[i] ? 'text-end' : 'text-start'} ${i === 0 ? 'sticky start-0 z-10 bg-card' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id and never reorder
            <tr key={r} className="border-b last:border-b-0">
              {table.columns.map((col, i) => {
                // The first column names the row and stays visible while the rest scrolls.
                const Cell = i === 0 ? 'th' : 'td';
                return (
                  <Cell
                    key={col.key}
                    scope={i === 0 ? 'row' : undefined}
                    className={`py-1.5 pe-4 ${numeric[i] ? 'text-end whitespace-nowrap' : 'min-w-32 text-start'} ${i === 0 ? 'sticky start-0 z-10 bg-card font-medium' : ''}`}
                  >
                    <Value
                      value={row[col.key] ?? null}
                      unit={col.unit}
                      sign={col.key === 'iata'}
                    />
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Success({ result }: { result: ToolSuccess }) {
  const generated = new Date(result.generatedAt);
  return (
    <Card className="gap-4 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="text-balance text-base leading-snug wrap-anywhere">
          {result.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        {result.metrics.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {result.metrics.map((m) => (
              <div key={m.label} className="flex flex-col">
                <dt className="text-muted-foreground text-xs wrap-anywhere">
                  {m.label}
                </dt>
                <dd className="font-semibold text-lg tabular-nums">
                  <Value value={m.value} unit={m.unit} />
                </dd>
                {m.percentile != null && (
                  <dd className="text-muted-foreground text-xs tabular-nums">
                    {ordinalPct(m.percentile)}
                    <span className="sr-only"> nationally</span>
                  </dd>
                )}
                {m.note && (
                  <dd className="text-muted-foreground text-xs">{m.note}</dd>
                )}
              </div>
            ))}
          </dl>
        )}
        {result.table && result.table.rows.length > 0 && (
          <ResultTable title={result.title} table={result.table} />
        )}
        {result.notes && result.notes.length > 0 && (
          <ul className="list-disc ps-5 text-sm leading-relaxed">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <footer className="flex flex-col gap-2 border-t pt-3 text-muted-foreground text-xs leading-relaxed">
          <p>
            Source: {result.source}. Period: {result.period}. Generated{' '}
            <time
              className="whitespace-nowrap tabular-nums"
              dateTime={result.generatedAt}
            >
              {Number.isNaN(generated.getTime())
                ? result.generatedAt
                : generated.toLocaleDateString('en-US', {
                    dateStyle: 'medium',
                  })}
            </time>
            .
          </p>
          <FootList title="Assumptions" items={result.assumptions} />
          <FootList title="Caveats" items={result.caveats} />
        </footer>
      </CardContent>
    </Card>
  );
}

// One card for every tool: all tool outputs share the ToolResult contract.
export function ResultCard({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return (
        <Card aria-busy className="gap-2 py-4 shadow-none">
          <CardHeader className="flex items-center gap-2 px-4">
            <LoaderCircle
              aria-hidden
              className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
            />
            <CardTitle className="font-normal text-muted-foreground text-sm">
              Gathering data
            </CardTitle>
          </CardHeader>
        </Card>
      );
    case 'output-error':
      return (
        <Unavailable reason="This lookup did not finish. Try asking again." />
      );
    case 'output-available': {
      const parsed = ToolResult.safeParse(part.output);
      if (!parsed.success)
        return (
          <Unavailable reason="The result came back in a form this page cannot show." />
        );
      if (!parsed.data.ok)
        return <Unavailable reason={errorCopy(parsed.data.error.kind)} />;
      return <Success result={parsed.data} />;
    }
    default:
      return null;
  }
}
