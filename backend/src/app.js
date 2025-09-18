import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import promClient from 'prom-client';

import { env } from './config/env.js';
import { connectDbs } from './db/index.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { notFound, errorHandler } from './middlewares/errors.js';
import { mountSwagger } from './api/swagger.js';
import { mountHealth } from './api/health.js';

export async function createApp() {
  await connectDbs();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(xss());
  app.use(morgan('dev'));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  if (env.enableMetrics) {
    promClient.collectDefaultMetrics();
  }

  app.use('/auth', authRouter);
  app.use('/', userRouter);

  mountSwagger(app);
  mountHealth(app, promClient, env.enableMetrics);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
