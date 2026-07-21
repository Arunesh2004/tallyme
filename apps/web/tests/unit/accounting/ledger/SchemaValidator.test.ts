import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../../../../modules/accounting/ledger/validators/SchemaValidator';

describe('Ledger SchemaValidator', () => {
  it('should validate a correct ledger', () => {
    const validData = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 100,
      openingBalanceType: 'Debit',
      email: 'test@abccorp.com'
    };
    
    expect(() => SchemaValidator.validate(validData)).not.toThrow();
  });

  it('should throw on negative opening balance', () => {
    const invalidData = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: -100,
      openingBalanceType: 'Debit'
    };
    
    expect(() => SchemaValidator.validate(invalidData)).toThrow();
  });

  it('should throw on invalid email', () => {
    const invalidData = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      email: 'not-an-email'
    };
    
    expect(() => SchemaValidator.validate(invalidData)).toThrow();
  });
});
