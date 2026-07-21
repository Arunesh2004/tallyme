import { describe, it, expect } from 'vitest';
import { BusinessValidator } from '../../../../modules/accounting/ledger/validators/BusinessValidator';
import { Ledger } from '../../../../modules/accounting/ledger/entities/Ledger';

describe('Ledger BusinessValidator', () => {
  it('should pass a valid ledger', () => {
    const ledger: Ledger = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 0,
      openingBalanceType: 'Debit'
    };
    
    expect(() => BusinessValidator.validate(ledger)).not.toThrow();
  });

  it('should throw if opening balance > 0 but type is missing', () => {
    const ledger = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 100
      // openingBalanceType is missing
    } as Ledger;
    
    expect(() => BusinessValidator.validate(ledger)).toThrow(/Opening balance type/);
  });

  it('should throw if PAN does not match GSTIN', () => {
    const ledger: Ledger = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 0,
      openingBalanceType: 'Debit',
      pan: 'ABCDE1234F',
      gstDetails: {
        gstin: '29XYZDE1234F1Z5' // Mismatched PAN
      }
    };
    
    expect(() => BusinessValidator.validate(ledger)).toThrow(/PAN does not match/);
  });
});
