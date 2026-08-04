import { ApplicationException } from './ApplicationException';

export class PeriodLockedException extends ApplicationException {
  constructor(message: string, public readonly periodId?: string) {
    super(message, 'PERIOD_LOCKED');
    this.name = 'PeriodLockedException';
  }
}
