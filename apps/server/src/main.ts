import { createDeepSeek } from '@ai-sdk/deepseek';
import { loadConfig } from './config';
import { createApp } from './http/app';

loadConfig(process.env).match(
  (config) => {
    const deepseek = createDeepSeek({ apiKey: config.DEEPSEEK_API_KEY });
    // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback.
    createApp({ model: deepseek(config.DEEPSEEK_MODEL) }).listen(
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
