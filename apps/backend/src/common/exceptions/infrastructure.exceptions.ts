import { HttpException, HttpStatus } from '@nestjs/common';

export class InfrastructureException extends HttpException {
  constructor(message: string, cause?: Error) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, { cause });
  }
}

export class DatabaseConnectionException extends InfrastructureException {
  constructor(message: string = 'Database connection failed', cause?: Error) {
    super(message, cause);
  }
}

export class RedisConnectionException extends InfrastructureException {
  constructor(message: string = 'Redis connection failed', cause?: Error) {
    super(message, cause);
  }
}

export class QueueInitializationException extends InfrastructureException {
  constructor(message: string = 'Queue initialization failed', cause?: Error) {
    super(message, cause);
  }
}
