import { z } from 'zod';

export const AppErrorKind = z.enum([
  'UpstreamUnavailable',
  'RateLimited',
  'NotFound',
  'InvalidInput',
]);
export const AppError = z.object({ kind: AppErrorKind, message: z.string() });
export type AppError = z.infer<typeof AppError>;

// Numbers are raw (percent 0–100); the web result card formats them by unit.
export const ToolUnit = z.enum([
  'count',
  'percent',
  'minutes',
  'miles',
  'seats',
  'score',
  'percentile',
]);
export type ToolUnit = z.infer<typeof ToolUnit>;

// `estimate: true` marks modelled values (e.g. seat gap); the card draws them dashed and labels them "est.".
export const ToolMetric = z.object({
  label: z.string(),
  value: z.number().nullable(),
  unit: ToolUnit,
  percentile: z.number().nullable().optional(),
  note: z.string().optional(),
  estimate: z.boolean().optional(),
});
export type ToolMetric = z.infer<typeof ToolMetric>;

export const ToolTable = z.object({
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      unit: ToolUnit.optional(),
      estimate: z.boolean().optional(),
    }),
  ),
  rows: z.array(
    z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  ),
  // Columns shown by default, in order; the rest sit behind "All metrics". `iata` followed by a
  // text column renders as one Airport cell.
  keyColumns: z.array(z.string()).optional(),
});
export type ToolTable = z.infer<typeof ToolTable>;

// The answer's deciding airport and number, computed by the tool so the UI never does arithmetic.
export const ToolHeadline = z.object({
  iata: z.string(),
  name: z.string(),
  label: z.string(),
  value: z.number().nullable(),
  unit: ToolUnit,
  estimate: z.boolean().optional(),
  // One line of context, e.g. "Ranked 1 of 14, 10 not ranked".
  context: z.string(),
  // National percentiles (0–100) that explain the value, e.g. Growth / Pressure / Scale.
  drivers: z
    .array(z.object({ label: z.string(), value: z.number().nullable() }))
    .optional(),
});
export type ToolHeadline = z.infer<typeof ToolHeadline>;

export const ToolSuccess = z.object({
  title: z.string(),
  headline: ToolHeadline.optional(),
  metrics: z.array(ToolMetric),
  table: ToolTable.optional(),
  notes: z.array(z.string()).optional(),
  source: z.string(),
  period: z.string(),
  generatedAt: z.string(),
  assumptions: z.array(z.string()),
  // Short label of the one caveat that changes the decision, e.g. "Profitability proxy, not ROI".
  caveatBadge: z.string().optional(),
  caveats: z.array(z.string()),
});
export type ToolSuccess = z.infer<typeof ToolSuccess>;

export const ToolResult = z.discriminatedUnion('ok', [
  ToolSuccess.extend({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: AppError }),
]);
export type ToolResult = z.infer<typeof ToolResult>;
