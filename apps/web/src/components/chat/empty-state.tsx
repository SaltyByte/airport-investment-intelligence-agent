// The four questions from the brief, each with the kind of answer it gets.
export const EXAMPLES = [
  {
    kind: 'Expansion ranking',
    question:
      'Which airports in New England are strong candidates for terminal expansion?',
  },
  {
    kind: 'Congestion comparison',
    question: 'Compare LA and Santa Ana airport congestion levels.',
  },
  {
    kind: 'Long-haul share',
    question:
      'What is the percentage of long haul flights out of Anchorage airport?',
  },
  {
    kind: 'Unmet demand',
    question: 'What is the unmet flight demand in SFO airport and why?',
  },
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
      className="flex max-w-2xl flex-col gap-5 pt-[6vh]"
    >
      <h2
        id="empty-title"
        className="text-balance font-semibold text-2xl leading-8 motion-safe:animate-enter"
      >
        Ask about US airport investment opportunities
      </h2>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {EXAMPLES.map(({ kind, question }, i) => (
          <li
            key={question}
            className="motion-safe:animate-enter"
            style={{ animationDelay: `${(i + 1) * STAGGER_MS}ms` }}
          >
            <button
              type="button"
              className="flex min-h-11 w-full flex-col gap-0.5 px-4 py-3 text-start outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-safe:active:bg-accent sm:px-5"
              onClick={() => onSelect(question)}
            >
              <span className="text-pretty font-medium">{question}</span>
              <span className="font-medium text-muted-foreground text-xs leading-4">
                {kind}
              </span>
            </button>
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
