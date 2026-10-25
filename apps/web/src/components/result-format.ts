import type { AppError, ToolUnit } from '@app/shared';

const fixed = (n: number, digits: number) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// `text` is what the eye reads; `spoken` spells out abbreviated units for screen readers.
export function formatValue(
  value: string | number | null,
  unit: ToolUnit | undefined,
): { text: string; spoken: string } {
  if (value === null) return { text: '—', spoken: 'not available' };
  if (typeof value === 'string') return { text: value, spoken: value };
  switch (unit) {
    case 'seats':
      return { text: fixed(value, 0), spoken: `${fixed(value, 0)} seats` };
    case 'percent':
      return {
        text: `${fixed(value, 1)}%`,
        spoken: `${fixed(value, 1)} percent`,
      };
    case 'minutes':
      return {
        text: `${fixed(value, 1)} min`,
        spoken: `${fixed(value, 1)} minutes`,
      };
    case 'miles':
      return {
        text: `${fixed(value, 0)} mi`,
        spoken: `${fixed(value, 0)} miles`,
      };
    case 'score':
    case 'percentile':
      return same(fixed(value, 1));
    case 'count':
      return same(fixed(value, 0));
    default:
      return same(value.toLocaleString('en-US'));
  }
}

const same = (text: string) => ({ text, spoken: text });

export function ordinalPct(p: number) {
  const n = Math.round(p);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ??
        'th');
  return `${n}${suffix} pct`;
}

const ERROR_COPY: Record<AppError['kind'], string> = {
  RateLimited: 'The data service is busy right now. Try again in a minute.',
  UpstreamUnavailable:
    'The data source could not be reached. Try again shortly.',
  NotFound: 'No data was found for that airport or area.',
  InvalidInput:
    'That request could not be answered as asked. Try rephrasing the question.',
};

export const errorCopy = (kind: AppError['kind']) => ERROR_COPY[kind];
