import type { AppUIMessage } from '@app/shared';
import { CircleAlert, LoaderCircle } from 'lucide-react';
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
    <Card className="gap-2 py-4 shadow-none">
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

export function AirportCard({ part }: { part: GetAirportPart }) {
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
              Looking up airport{part.input?.iata ? ` ${part.input.iata}` : ''}
            </CardTitle>
          </CardHeader>
        </Card>
      );
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
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="flex items-center gap-3 px-4">
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
