import { z } from 'zod';

export const AppErrorKind = z.enum([
  'UpstreamUnavailable',
  'RateLimited',
  'NotFound',
  'InvalidInput',
]);
export const AppError = z.object({ kind: AppErrorKind, message: z.string() });
export type AppError = z.infer<typeof AppError>;

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
  keyColumns: z.array(z.string()).optional(),
});
export type ToolTable = z.infer<typeof ToolTable>;

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
  caveatBadge: z.string().optional(),
  caveats: z.array(z.string()),
});
export type ToolSuccess = z.infer<typeof ToolSuccess>;

export const ToolResult = z.discriminatedUnion('ok', [
  ToolSuccess.extend({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: AppError }),
]);
export type ToolResult = z.infer<typeof ToolResult>;
