import { createDeepSeek } from '@ai-sdk/deepseek';
import { staleNotice } from './agent/tools/result';
import { loadConfig } from './config';
import { createApp } from './http/app';
import { buildNationalKpis } from './kpis/airport-kpis';
import { loadSnapshot } from './snapshot/load';

loadConfig(process.env)
  .andThen((config) =>
    loadSnapshot()
      .map((snapshot) => ({
        config,
        ctx: { snapshot, kpis: buildNationalKpis(snapshot) },
      }))
      .mapErr(
        (error) =>
          `Airport data snapshot failed to load: ${error.message}. Run \`pnpm ingest\` to build it.`,
      ),
  )
  .match(
    ({ config, ctx }) => {
      const stale = staleNotice(ctx.snapshot.meta, new Date());
      if (stale) console.warn(stale);
      const deepseek = createDeepSeek({ apiKey: config.DEEPSEEK_API_KEY });
      // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback.
      const server = createApp({
        model: deepseek(config.DEEPSEEK_MODEL),
        ctx,
      }).listen(config.SERVER_PORT, (error) => {
        if (error) {
          console.error(`server failed to start: ${error.message}`);
          process.exit(1);
        }
        console.log(
          `server listening on http://localhost:${config.SERVER_PORT}`,
        );
      });
      // PID 1 in the container gets no default SIGTERM action; close so deploys stop promptly.
      process.on('SIGTERM', () => server.close(() => process.exit(0)));
    },
    (message) => {
      console.error(message);
      process.exit(1);
    },
  );
