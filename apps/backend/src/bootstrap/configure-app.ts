import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

export const configureApp = (app: INestApplication) => {
  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // Cookie parser
  app.use(cookieParser());

  // Trust proxy (useful behind reverse proxies like Nginx/ALB)
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && httpAdapter.getInstance().set) {
    httpAdapter.getInstance().set('trust proxy', 1);
  }

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : '*',
    credentials: true,
  });

  // API Versioning
  app.setGlobalPrefix('api/v1');
};
