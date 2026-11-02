import 'dotenv/config';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes.js';

export function createApp(): Express {
  const app = express();

  // Helmet with relaxed CSP for inline scripts & dev Vite server
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      crossOriginResourcePolicy: false,
    })
  );

  // Parse cookies & json bodies (captures rawBody for webhook signature verification)
  app.use(cookieParser());
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  const clientOrigin = process.env.CLIENT_ORIGIN || true;
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    })
  );

  // Rate limiting on authentication routes (60 requests per 15 minutes)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login or signup attempts. Please try again after 15 minutes.' },
  });

  app.use('/api/auth/signup', authLimiter);
  app.use('/api/auth/login', authLimiter);

  // Static serving for uploaded beverage images
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch {
      // Ignore directory creation failure in read-only environments
    }
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mount API endpoints
  app.use('/api', apiRouter);

  return app;
}
