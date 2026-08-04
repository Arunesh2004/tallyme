import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

export const configureApp = (app: INestApplication) => {
  // Security headers with CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // Cookie parser
  app.use(cookieParser());

  // CSRF Protection
  const csrfProtection = require('csurf')({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  });
  app.use((req: any, res: any, next: any) => {
    if (
      req.path.startsWith('/api/v1/health') ||
      req.path.startsWith('/api/v1/mail/webhook') ||
      req.path.startsWith('/api/v1/metrics') ||
      req.path.startsWith('/api/v1/api/erp-sync/metrics')
    ) {
      return next();
    }

    // SAFE LOGGING FOR CSRF
    return csrfProtection(req, res, (err: any) => {
      if (err) {
        if (err.code === 'EBADCSRFTOKEN') {
          console.log(
            '[CSRF Middleware] REJECT: Invalid CSRF Token on path',
            req.path,
          );
          console.log(
            '[CSRF Middleware] Headers present:',
            Object.keys(req.headers),
          );
        } else {
          console.log('[CSRF Middleware] Error:', err.message);
        }
        return next(err);
      }
      return next();
    });
  });

  // Trust proxy (useful behind reverse proxies like Nginx/ALB)
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && httpAdapter.getInstance().set) {
    httpAdapter.getInstance().set('trust proxy', 1);
  }

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.tallyme.com',
    ],
    credentials: true,
  });

  // API Versioning
  app.setGlobalPrefix('api/v1');
};
