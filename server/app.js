import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import env from './config/env.js';
import api from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => (!origin || env.corsOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Uploaded files (images / attachments) — served with safe headers
app.use('/uploads', express.static(env.uploadDir, {
  maxAge: '7d',
  setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'"); },
}));

app.use('/api', apiLimiter, api);
app.use(notFound);
app.use(errorHandler);

export default app;
