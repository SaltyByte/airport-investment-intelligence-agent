export type Period = { start: string; end: string; months: string[] };

export const formatMonth = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

const addMonths = (month: string, n: number): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  return formatMonth(Math.floor(total / 12), (total % 12) + 1);
};

/** Trailing 12 months ending at the latest month both BTS sources cover. */
export const selectPeriod = (
  latestT100: string,
  latestOnTime: string,
): Period => {
  const end = latestT100 < latestOnTime ? latestT100 : latestOnTime;
  const months = Array.from({ length: 12 }, (_, i) => addMonths(end, i - 11));
  return { start: months[0] as string, end, months };
};
