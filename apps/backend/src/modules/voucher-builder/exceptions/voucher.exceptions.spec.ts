import { VoucherDomainException } from './voucher.exceptions';
import { HttpStatus } from '@nestjs/common';

describe('VoucherDomainException', () => {
  it('should create exception with default status', () => {
    const ex = new VoucherDomainException('Error');
    expect(ex.message).toBe('Error');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should create exception with custom status and cause', () => {
    const cause = new Error('Cause');
    const ex = new VoucherDomainException('Error', HttpStatus.INTERNAL_SERVER_ERROR, cause);
    expect(ex.message).toBe('Error');
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(ex.cause).toBe(cause);
  });
});
