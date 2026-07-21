import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './logger.constants';
import { RequestContextService } from '../context/request-context.service';

@Global()
@Module({
  imports: [
    PinoModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('app.env') === 'production';
        return {
          pinoHttp: {
            level: config.get('logger.level') || 'info',
            genReqId: (req: any) =>
              req.headers[CORRELATION_ID_HEADER] ||
              req.headers[REQUEST_ID_HEADER] ||
              RequestContextService.getCorrelationId() ||
              crypto.randomUUID(),
            customProps: (req: any, res: any) => {
              return {
                userId: req.user?.id,
                companyId: req.user?.companyId,
                workerId: process.env.WORKER_ID || 'web-api-1',
                erpJobId: req.headers['x-erp-job-id'],
              };
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'body.password',
              ],
              censor: '[REDACTED]',
            },
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                }
              : undefined,
          },
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
