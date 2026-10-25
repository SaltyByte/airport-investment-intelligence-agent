import { createDeepSeek } from '@ai-sdk/deepseek';
import { loadConfig } from './config';
import { createApp } from './http/app';
import { loadSnapshot } from './ingest/load-snapshot';
import { buildNationalKpis } from './kpis/national';

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
      const deepseek = createDeepSeek({ apiKey: config.DEEPSEEK_API_KEY });
      // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback.
      createApp({ model: deepseek(config.DEEPSEEK_MODEL), ctx }).listen(
        config.SERVER_PORT,
        (error) => {
          if (error) {
            console.error(`server failed to start: ${error.message}`);
            process.exit(1);
          }
          console.log(
            `server listening on http://localhost:${config.SERVER_PORT}`,
          );
        },
      );
    },
    (message) => {
      console.error(message);
      process.exit(1);
    },
  );
