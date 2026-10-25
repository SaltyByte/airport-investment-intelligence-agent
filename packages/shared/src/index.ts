import type { UIDataTypes, UIMessage } from 'ai';
import { z } from 'zod';

export const AppErrorKind = z.enum([
  'UpstreamUnavailable',
  'RateLimited',
  'NotFound',
  'InvalidInput',
]);
export const AppError = z.object({ kind: AppErrorKind, message: z.string() });
export type AppError = z.infer<typeof AppError>;

export const GetAirportInput = z.object({
  iata: z.string().regex(/^[A-Z]{3}$/, 'IATA code must be 3 uppercase letters'),
});
export type GetAirportInput = z.infer<typeof GetAirportInput>;

export const Airport = z.object({
  iata: z.string(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
});
export type Airport = z.infer<typeof Airport>;

export const GetAirportOutput = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    airport: Airport,
    source: z.string(),
    asOf: z.string(),
  }),
  z.object({ ok: z.literal(false), error: AppError }),
]);
export type GetAirportOutput = z.infer<typeof GetAirportOutput>;

export type AppUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  { getAirport: { input: GetAirportInput; output: GetAirportOutput } }
>;
