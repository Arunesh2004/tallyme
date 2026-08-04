import { DateParserUtil } from './date-parser.util';

describe('DateParserUtil', () => {
  describe('parse', () => {
    it('should return null for null/undefined/empty string', () => {
      expect(DateParserUtil.parse(null)).toBeNull();
      expect(DateParserUtil.parse(undefined)).toBeNull();
      expect(DateParserUtil.parse('')).toBeNull();
      expect(DateParserUtil.parse('   ')).toBeNull();
    });

    it('should return null for non-string types', () => {
      expect(DateParserUtil.parse(12345 as any)).toBeNull();
      expect(DateParserUtil.parse({} as any)).toBeNull();
    });

    it('should return null for N/A or UNKNOWN', () => {
      expect(DateParserUtil.parse('N/A')).toBeNull();
      expect(DateParserUtil.parse('unknown')).toBeNull();
    });

    it('should parse DD/MM/YYYY format', () => {
      const date = DateParserUtil.parse('15/01/2024');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0); // 0-indexed month
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should parse DD-MM-YYYY format', () => {
      const date = DateParserUtil.parse('15-01-2024');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const date = DateParserUtil.parse('2024-01-15');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should parse YYYY/MM/DD format', () => {
      const date = DateParserUtil.parse('2024/01/15');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should fallback to standard Date parse for ISO strings', () => {
      const date = DateParserUtil.parse('2024-01-15T12:00:00Z');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2024);
      expect(date?.getUTCMonth()).toBe(0);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should return null for invalid date values (month > 12)', () => {
      expect(DateParserUtil.parse('15/13/2024')).toBeNull();
    });

    it('should return null for invalid date values (day > 31)', () => {
      expect(DateParserUtil.parse('32/01/2024')).toBeNull();
    });

    it('should return null for invalid days in month (Feb 30)', () => {
      expect(DateParserUtil.parse('30/02/2024')).toBeNull();
    });

    it('should return null for completely invalid string format', () => {
      expect(DateParserUtil.parse('invalid-date')).toBeNull();
    });
  });
});
