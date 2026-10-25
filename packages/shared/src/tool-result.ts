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

export const ToolMetric = z.object({
  label: z.string(),
  value: z.number().nullable(),
  unit: ToolUnit,
  percentile: z.number().nullable().optional(),
  note: z.string().optional(),
});
export type ToolMetric = z.infer<typeof ToolMetric>;

export const ToolTable = z.object({
  columns: z.array(
    z.object({ key: z.string(), label: z.string(), unit: ToolUnit.optional() }),
  ),
  rows: z.array(
    z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  ),
});
export type ToolTable = z.infer<typeof ToolTable>;

export const ToolSuccess = z.object({
  title: z.string(),
  metrics: z.array(ToolMetric),
  table: ToolTable.optional(),
  notes: z.array(z.string()).optional(),
  source: z.string(),
  period: z.string(),
  generatedAt: z.string(),
  assumptions: z.array(z.string()),
  caveats: z.array(z.string()),
});
export type ToolSuccess = z.infer<typeof ToolSuccess>;

export const ToolResult = z.discriminatedUnion('ok', [
  ToolSuccess.extend({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: AppError }),
]);
export type ToolResult = z.infer<typeof ToolResult>;
