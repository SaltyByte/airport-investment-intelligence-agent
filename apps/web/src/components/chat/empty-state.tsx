import { Button } from '@/components/ui/button';

const EXAMPLES = [
  'Which airports in New England are strong candidates for terminal expansion?',
  'Compare LA and Santa Ana airport congestion levels.',
  'What is the percentage of long haul flights out of Anchorage airport?',
  'What is the unmet flight demand in SFO airport and why?',
];

export function EmptyState({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  return (
    <section
      aria-labelledby="empty-title"
      className="flex flex-col gap-4 pt-[8vh]"
    >
      <h2 id="empty-title" className="text-balance font-semibold text-xl">
        Ask about US airport investment opportunities
      </h2>
      <ul className="flex flex-col gap-2">
        {EXAMPLES.map((q) => (
          <li key={q}>
            <Button
              variant="outline"
              className="h-auto min-h-11 w-full justify-start bg-card py-2.5 text-left whitespace-normal"
              onClick={() => onSelect(q)}
            >
              {q}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        Covers US airports using public data. Figures are estimates, each shown
        with its as-of date.
      </p>
    </section>
  );
}
