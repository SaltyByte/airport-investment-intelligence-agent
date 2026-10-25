import type { AppError } from '@app/shared';
import { type LanguageModel, pipeUIMessageStreamToResponse } from 'ai';
import express from 'express';
import { streamChat } from '../agent';

const STATUS: Record<AppError['kind'], number> = {
  InvalidInput: 400,
  NotFound: 404,
  RateLimited: 429,
  UpstreamUnavailable: 502,
};

export const createApp = ({ model }: { model: LanguageModel }) => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/chat', async (req, res) => {
    (await streamChat(model, req.body?.messages)).match(
      (stream) => pipeUIMessageStreamToResponse({ response: res, stream }),
      (error) => res.status(STATUS[error.kind]).json({ error }),
    );
  });

  return app;
};
