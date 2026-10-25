import type { AppUIMessage } from '@app/shared';
import { cn } from 'cn';
import { CircleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type GetAirportPart = Extract<
  AppUIMessage['parts'][number],
  { type: 'tool-getAirport' }
>;

function CodeSign({ code }: { code: string }) {
  // Styled after an airfield location sign: yellow letters on a black field.
  return (
    <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-sm bg-foreground px-2 font-semibold text-highlight tracking-wide ring-1 ring-highlight ring-inset">
      {code}
    </span>
  );
}

function Unavailable({ title, reason }: { title: string; reason: string }) {
  return (
    <Card className="gap-2 py-4 shadow-none motion-safe:animate-fade-in">
      <CardHeader className="flex items-center gap-2 px-4">
        <CircleAlert aria-hidden className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 text-muted-foreground text-sm">
        {reason}
      </CardContent>
    </Card>
  );
}

function Bar({ className }: { className: string }) {
  return <span className={cn('skeleton block rounded-sm', className)} />;
}

// Same box model as the data card (header sign, two table rows, source line), so the swap to
// the real card does not move anything below it. The status text stays readable for everyone.
function AirportSkeleton({ iata }: { iata?: string }) {
  const row = 'flex h-5 items-center gap-4';
  return (
    <Card
      aria-busy
      className="gap-3 py-4 shadow-none motion-safe:animate-fade-in"
    >
      <CardHeader className="flex min-h-10 items-center gap-3 px-4 sm:min-h-0">
        <Bar className="h-7 w-12" />
        <CardTitle className="font-normal text-muted-foreground text-sm">
          Looking up airport{iata ? ` ${iata}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent aria-hidden className="px-4">
        <div className="border-b py-1.5">
          <div className={row}>
            <Bar className="h-3 w-8" />
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-16" />
          </div>
        </div>
        <div className="py-1.5">
          <div className={row}>
            <Bar className="h-3 w-8" />
            <Bar className="h-3 w-40" />
            <Bar className="h-3 w-16" />
          </div>
        </div>
        <div className="mt-3 flex h-4 items-center">
          <Bar className="h-2.5 w-44" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AirportCard({ part }: { part: GetAirportPart }) {
  switch (part.state) {
    case 'input-streaming':
    case 'input-available':
      return <AirportSkeleton iata={part.input?.iata} />;
    case 'output-error':
      return (
        <Unavailable title="Airport lookup failed" reason={part.errorText} />
      );
    case 'output-available': {
      const out = part.output;
      if (!out.ok) {
        return (
          <Unavailable title="Data unavailable" reason={out.error.message} />
        );
      }
      const { airport } = out;
      return (
        <Card className="gap-3 py-4 shadow-none motion-safe:animate-fade-in">
          <CardHeader className="flex min-h-10 items-center gap-3 px-4 sm:min-h-0">
            <CodeSign code={airport.iata} />
            <CardTitle className="text-sm">{airport.name}</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {/* Wide tables scroll inside the card; the page never scrolls sideways. */}
            <section
              aria-label={`${airport.iata} airport details`}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-scrollable
              tabIndex={0}
              className="overflow-x-auto rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-1.5 pr-4 font-medium">
                      IATA
                    </th>
                    <th scope="col" className="py-1.5 pr-4 font-medium">
                      Name
                    </th>
                    <th scope="col" className="py-1.5 pr-4 font-medium">
                      City
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      State
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 pr-4 whitespace-nowrap">
                      {airport.iata}
                    </td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">
                      {airport.name}
                    </td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">
                      {airport.city}
                    </td>
                    <td className="py-1.5 whitespace-nowrap">
                      {airport.state}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
            <p className="mt-3 text-muted-foreground text-xs">
              Source: {out.source}. As of{' '}
              <time
                className="whitespace-nowrap tabular-nums"
                dateTime={out.asOf}
              >
                {out.asOf}
              </time>
              .
            </p>
          </CardContent>
        </Card>
      );
    }
    default:
      return null;
  }
}
