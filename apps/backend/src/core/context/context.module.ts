import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ContextMiddleware } from './context.middleware';
import { RequestContextService } from './request-context.service';
import { CompanyContextService } from './company-context.service';

@Module({
  providers: [RequestContextService, CompanyContextService],
  exports: [RequestContextService, CompanyContextService],
})
export class ContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
