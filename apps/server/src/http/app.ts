import { fileURLToPath } from 'node:url';
import type { AppError } from '@app/shared';
import { type LanguageModel, pipeUIMessageStreamToResponse } from 'ai';
import express from 'express';
import { streamChat } from '../agent';
import type { ToolContext } from '../agent/tools';

const STATUS: Record<AppError['kind'], number> = {
  InvalidInput: 400,
  NotFound: 404,
  RateLimited: 429,
  UpstreamUnavailable: 502,
};

export const createApp = ({
  model,
  ctx,
}: {
  model: LanguageModel;
  ctx: ToolContext;
}) => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/chat', async (req, res) => {
    (await streamChat(model, ctx, req.body?.messages)).match(
      (stream) => pipeUIMessageStreamToResponse({ response: res, stream }),
      (error) => res.status(STATUS[error.kind]).json({ error }),
    );
  });

  // Built web app; when apps/web/dist is absent (dev) requests just fall through.
  const webDist = fileURLToPath(new URL('../../../web/dist', import.meta.url));
  app.use(express.static(webDist));

  return app;
};
