import { Button } from '@/components/ui/button';

const EXAMPLES = [
  'Which airports in New England are strong candidates for terminal expansion?',
  'Compare LA and Santa Ana airport congestion levels.',
  'What is the percentage of long haul flights out of Anchorage airport?',
  'What is the unmet flight demand in SFO airport and why?',
];

// One staggered intro on first load: heading, then each question, then the footnote.
const STAGGER_MS = 50;

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
      <h2
        id="empty-title"
        className="text-balance font-semibold text-xl motion-safe:animate-enter"
      >
        Ask about US airport investment opportunities
      </h2>
      <ul className="flex flex-col gap-2">
        {EXAMPLES.map((q, i) => (
          <li
            key={q}
            className="motion-safe:animate-enter"
            style={{ animationDelay: `${(i + 1) * STAGGER_MS}ms` }}
          >
            <Button
              variant="outline"
              className="h-auto min-h-11 w-full justify-start bg-card py-2.5 text-left whitespace-normal motion-safe:active:scale-[0.99]"
              onClick={() => onSelect(q)}
            >
              {q}
            </Button>
          </li>
        ))}
      </ul>
      <p
        className="text-muted-foreground text-sm motion-safe:animate-enter"
        style={{ animationDelay: `${(EXAMPLES.length + 1) * STAGGER_MS}ms` }}
      >
        Covers US airports using public data. Figures are estimates, each shown
        with its as-of date.
      </p>
    </section>
  );
}
