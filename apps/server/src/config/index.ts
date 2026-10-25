import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';

const Env = z.object({
  DEEPSEEK_API_KEY: z.string({ error: 'is required' }).min(1, 'is required'),
  DEEPSEEK_MODEL: z.string().min(1).default('deepseek-v4-flash'),
  SERVER_PORT: z.coerce.number().int().positive().default(4100),
});
export type Config = z.infer<typeof Env>;

export const loadConfig = (
  env: Record<string, string | undefined>,
): Result<Config, string> => {
  const parsed = Env.safeParse(env);
  if (parsed.success) return ok(parsed.data);
  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join('.')} ${issue.message}`)
    .join('; ');
  return err(
    `Invalid environment: ${problems}. Copy .env.example to .env and fill it in.`,
  );
};
