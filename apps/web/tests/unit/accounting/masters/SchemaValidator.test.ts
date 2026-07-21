import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../../../../modules/accounting/masters/validators/SchemaValidator';
import { MasterType } from '../../../../modules/accounting/masters/entities/MasterType';

describe('Masters SchemaValidator', () => {
  it('should validate a valid Godown DTO', () => {
    const data = {
      masterType: MasterType.Godown,
      name: 'Main Warehouse',
      address: '123 Main St'
    };
    expect(() => SchemaValidator.validate(data)).not.toThrow();
  });

  it('should validate a valid Unit DTO', () => {
    const data = {
      masterType: MasterType.Unit,
      name: 'KGS',
      formalName: 'Kilograms',
      decimalPlaces: 2
    };
    expect(() => SchemaValidator.validate(data)).not.toThrow();
  });

  it('should throw on missing name', () => {
    const data = {
      masterType: MasterType.Unit,
      formalName: 'Kilograms',
    };
    expect(() => SchemaValidator.validate(data)).toThrow();
  });
});
